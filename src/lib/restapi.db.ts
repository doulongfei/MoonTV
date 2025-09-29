import { AdminConfig } from './admin.types';
import { Favorite, IStorage, PlayRecord } from './types';

// REST API 存储实现，统一前缀 /tv
export class RestApiStorage implements IStorage {
  private baseUrl: string;
  constructor() {
    this.baseUrl = process.env.REST_API_URL || 'https://api.doufei.eu.org/tv';
  }

  // ---------- 播放记录 ----------
  async getPlayRecord(
    userName: string,
    key: string
  ): Promise<PlayRecord | null> {
    const res = await fetch(`${this.baseUrl}/playrecords/${userName}/${key}`);
    if (!res.ok) return null;
    return await res.json();
  }
  async setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void> {
    await fetch(`${this.baseUrl}/playrecords/${userName}/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  }
  async getAllPlayRecords(
    userName: string
  ): Promise<Record<string, PlayRecord>> {
    const res = await fetch(`${this.baseUrl}/playrecords/${userName}`);
    if (!res.ok) return {};
    return await res.json();
  }
  async deletePlayRecord(userName: string, key: string): Promise<void> {
    await fetch(`${this.baseUrl}/playrecords/${userName}/${key}`, {
      method: 'DELETE',
    });
  }

  // ---------- 收藏 ----------
  async getFavorite(userName: string, key: string): Promise<Favorite | null> {
    const res = await fetch(`${this.baseUrl}/favorites/${userName}/${key}`);
    if (!res.ok) return null;
    return await res.json();
  }
  async setFavorite(
    userName: string,
    key: string,
    favorite: Favorite
  ): Promise<void> {
    await fetch(`${this.baseUrl}/favorites/${userName}/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(favorite),
    });
  }
  async getAllFavorites(userName: string): Promise<Record<string, Favorite>> {
    const res = await fetch(`${this.baseUrl}/favorites/${userName}`);
    if (!res.ok) return {};
    return await res.json();
  }
  async deleteFavorite(userName: string, key: string): Promise<void> {
    await fetch(`${this.baseUrl}/favorites/${userName}/${key}`, {
      method: 'DELETE',
    });
  }

  // ---------- 用户注册 / 登录 ----------
  async registerUser(userName: string, password: string): Promise<void> {
    await fetch(`${this.baseUrl}/users/${userName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  }
  async verifyUser(userName: string, password: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/users/${userName}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.valid;
  }
  async checkUserExist(userName: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/users/${userName}/exist`);
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.exist;
  }
  async changePassword(userName: string, newPassword: string): Promise<void> {
    await fetch(`${this.baseUrl}/users/${userName}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
  }
  async deleteUser(userName: string): Promise<void> {
    await fetch(`${this.baseUrl}/users/${userName}`, { method: 'DELETE' });
  }

  // ---------- 搜索历史 ----------
  async getSearchHistory(userName: string): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/searchhistory/${userName}`);
    if (!res.ok) return [];
    return await res.json();
  }
  async addSearchHistory(userName: string, keyword: string): Promise<void> {
    await fetch(`${this.baseUrl}/searchhistory/${userName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    });
  }
  async deleteSearchHistory(userName: string, keyword?: string): Promise<void> {
    if (keyword) {
      await fetch(
        `${this.baseUrl}/searchhistory/${userName}/${encodeURIComponent(
          keyword
        )}`,
        { method: 'DELETE' }
      );
    } else {
      await fetch(`${this.baseUrl}/searchhistory/${userName}`, {
        method: 'DELETE',
      });
    }
  }

  // ---------- 获取全部用户 ----------
  async getAllUsers(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/users`);
    if (!res.ok) return [];
    return await res.json();
  }

  // ---------- 管理员配置 ----------
  async getAdminConfig(): Promise<AdminConfig | null> {
    const res = await fetch(`${this.baseUrl}/admin/config`);
    if (!res.ok) return null;
    return await res.json();
  }
  async setAdminConfig(config: AdminConfig): Promise<void> {
    await fetch(`${this.baseUrl}/admin/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }
}
