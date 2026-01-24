/* eslint-disable no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { Redis } from '@upstash/redis';

import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord } from './types';

// 搜索历史最大条数
const SEARCH_HISTORY_LIMIT = 20;

export class RedisStorage implements IStorage {
  private client: Redis;

  constructor() {
    this.client = Redis.fromEnv();
  }

  // ---------- 播放记录 ----------
  private prKey(user: string, key: string) {
    return `u:${user}:pr:${key}`; // u:username:pr:source+id
  }

  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    const val = await this.client.get<PlayRecord>(this.prKey(userName, key));
    // Upstash Redis automatically parses JSON if it was stored as JSON, 
    // but here we might need to handle it carefully. 
    // If we store with JSON.stringify, we might get a string back or an object depending on how it's saved.
    // Let's assume consistent behavior: we store strings or objects.
    // The previous implementation used JSON.stringify.
    // Upstash client can handle objects directly.
    return val || null;
  }

  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    await this.client.set(this.prKey(userName, key), record);
  }

  async getAllPlayRecords(
    userName: string
  ): Promise<Record<string, PlayRecord>> {
    const pattern = `u:${userName}:pr:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return {};
    
    // mget in upstash returns array of values
    const values = await this.client.mget<PlayRecord[]>(...keys);
    
    const result: Record<string, PlayRecord> = {};
    keys.forEach((fullKey: string, idx: number) => {
      const rec = values[idx];
      if (rec) {
        // 截取 source+id 部分
        const keyPart = fullKey.replace(`u:${userName}:pr:`, '');
        result[keyPart] = rec;
      }
    });
    return result;
  }

  async deletePlayRecord(userName: string, key: string): Promise<void> {
    await this.client.del(this.prKey(userName, key));
  }

  // ---------- 收藏 ----------
  private favKey(user: string, key: string) {
    return `u:${user}:fav:${key}`;
  }

  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const val = await this.client.get<Favorite>(this.favKey(userName, key));
    return val || null;
  }

  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    await this.client.set(this.favKey(userName, key), favorite);
  }

  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    const pattern = `u:${userName}:fav:*`;
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return {};
    
    const values = await this.client.mget<Favorite[]>(...keys);
    
    const result: Record<string, Favorite> = {};
    keys.forEach((fullKey: string, idx: number) => {
      const fav = values[idx];
      if (fav) {
        const keyPart = fullKey.replace(`u:${userName}:fav:`, '');
        result[keyPart] = fav;
      }
    });
    return result;
  }

  async deleteFavorite(userName: string, key: string): Promise<void> {
    await this.client.del(this.favKey(userName, key));
  }

  // ---------- 用户注册 / 登录 ----------
  private userPwdKey(user: string) {
    return `u:${user}:pwd`;
  }

  async registerUser(userName: string, password: string): Promise<void> {
    // 简单存储明文密码，生产环境应加密
    await this.client.set(this.userPwdKey(userName), password);
  }

  async verifyUser(userName: string, password: string): Promise<boolean> {
    const stored = await this.client.get<string>(this.userPwdKey(userName));
    if (stored === null) return false;
    return stored === password;
  }

  // 检查用户是否存在
  async checkUserExist(userName: string): Promise<boolean> {
    const exists = await this.client.exists(this.userPwdKey(userName));
    return exists === 1;
  }

  // 修改用户密码
  async changePassword(userName: string, newPassword: string): Promise<void> {
    await this.client.set(this.userPwdKey(userName), newPassword);
  }

  // 删除用户及其所有数据
  async deleteUser(userName: string): Promise<void> {
    // 删除用户密码
    await this.client.del(this.userPwdKey(userName));

    // 删除搜索历史
    await this.client.del(this.shKey(userName));

    // 删除播放记录
    const playRecordPattern = `u:${userName}:pr:*`;
    const playRecordKeys = await this.client.keys(playRecordPattern);
    if (playRecordKeys.length > 0) {
      await this.client.del(...playRecordKeys);
    }

    // 删除收藏夹
    const favoritePattern = `u:${userName}:fav:*`;
    const favoriteKeys = await this.client.keys(favoritePattern);
    if (favoriteKeys.length > 0) {
      await this.client.del(...favoriteKeys);
    }
  }

  // ---------- 搜索历史 ----------
  private shKey(user: string) {
    return `u:${user}:sh`; // u:username:sh
  }

  async getSearchHistory(userName: string): Promise<string[]> {
    return (await this.client.lrange(this.shKey(userName), 0, -1)) || [];
  }

  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    const key = this.shKey(userName);
    // 先去重
    await this.client.lrem(key, 0, keyword);
    // 插入到最前
    await this.client.lpush(key, keyword);
    // 限制最大长度
    await this.client.ltrim(key, 0, SEARCH_HISTORY_LIMIT - 1);
  }

  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    const key = this.shKey(userName);
    if (keyword) {
      await this.client.lrem(key, 0, keyword);
    } else {
      await this.client.del(key);
    }
  }

  // ---------- 获取全部用户 ----------
  async getAllUsers(): Promise<string[]> {
    const keys = await this.client.keys('u:*:pwd');
    return keys
      .map((k) => {
        const match = k.match(/^u:(.+?):pwd$/);
        return match ? match[1] : undefined;
      })
      .filter((u): u is string => typeof u === 'string');
  }

  // ---------- 管理员配置 ----------
  private adminConfigKey() {
    return 'admin:config';
  }

  async getAdminConfig(): Promise<AdminConfig | null> {
    const val = await this.client.get<AdminConfig>(this.adminConfigKey());
    return val || null;
  }

  async setAdminConfig(config: AdminConfig): Promise<void> {
    await this.client.set(this.adminConfigKey(), config);
  }
}