import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface CommunityPost {
  id?: number;
  authorId?: number;
  title: string;
  content: string;
  tags?: string[];
  likesCount?: number;
  platform?: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | 'other';
  status?: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
  User?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Comment {
  id?: number;
  postId: number;
  authorId?: number;
  content: string;
  createdAt?: string;
  User?: {
    id: number;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CommunityService {
  private apiUrl = `${API_BASE_URL}/community`;

  constructor(private http: HttpClient) {}

  // الحصول على المنشورات
  getPosts(tag?: string): Observable<any> {
    const url = tag ? `${this.apiUrl}/posts?tag=${tag}` : `${this.apiUrl}/posts`;
    return this.http.get(url);
  }

  // الحصول على منشور واحد مع التعليقات
  getPost(postId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/posts/${postId}`);
  }

  // إنشاء منشور
  createPost(post: Partial<CommunityPost>): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts`, post);
  }

  // تحديث منشور
  updatePost(postId: number, data: Partial<CommunityPost>): Observable<any> {
    return this.http.put(`${this.apiUrl}/posts/${postId}`, data);
  }

  // الإعجاب/إلغاء الإعجاب بمنشور
  toggleLike(postId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/posts/${postId}/like`, {});
  }

  // إضافة تعليق
  addComment(postId: number, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts/${postId}/comments`, { content });
  }

  // الحصول على تعليقات المنشور
  getComments(postId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/posts/${postId}/comments`);
  }

  // حذف منشور
  deletePost(postId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/posts/${postId}`);
  }
}
