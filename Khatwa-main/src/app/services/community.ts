import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CommunityPost {
  id?: number;
  userId?: number;
  title: string;
  content: string;
  tags?: string[];
  likesCount?: number;
  createdAt?: string;
  User?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Comment {
  id?: number;
  postId: number;
  userId?: number;
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
  private apiUrl = 'https://khatwabackend-production.up.railway.app/api/v1/community';

  constructor(private http: HttpClient) {}

  // الحصول على المنشورات
  getPosts(tag?: string): Observable<any> {
    const url = tag ? `${this.apiUrl}/posts?tag=${tag}` : `${this.apiUrl}/posts`;
    return this.http.get(url);
  }

  // إنشاء منشور
  createPost(post: CommunityPost): Observable<any> {
    return this.http.post(`${this.apiUrl}/posts`, post);
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