import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface TeamMember {
  id?: number;
  projectId?: number;
  userId?: number;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  jobTitle?: string;
  status?: 'invited' | 'active';
  joinedAt?: string;
  User?: {
    id: number;
    name: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  // إضافة عضو للفريق
  addMember(projectId: number, data: { userId: number; role: string; jobTitle?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/team`, data);
  }

  // دعوة عضو بالبريد الإلكتروني
  inviteMember(projectId: number, data: { email: string; role: string; jobTitle?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/team/invite`, data);
  }

  // الحصول على أعضاء الفريق
  getTeamMembers(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/team`);
  }

  // إزالة عضو من الفريق
  removeMember(projectId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${projectId}/team/${userId}`);
  }

  // تحديث دور العضو
  updateMemberRole(projectId: number, userId: number, role: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/projects/${projectId}/team/${userId}`, { role });
  }
}
