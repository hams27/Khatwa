import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TeamMember {
  id?: number;
  projectId: number;
  userId: number;
  role: 'owner' | 'admin' | 'member';
  createdAt?: string;
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
  private apiUrl = 'https://khatwabackend-production.up.railway.app/api/v1';

  constructor(private http: HttpClient) {}

  // إضافة عضو للفريق
  addMember(projectId: number, data: { userId: number; role: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/team`, data);
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