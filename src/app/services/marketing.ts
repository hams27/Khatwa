import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface MarketingPlan {
  id?: number;
  projectId?: number;
  objectives?: any;
  targetAudience?: any;
  channels?: any;
  contentStrategy?: string;
  timeline?: any;
  budget?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketingService {
  private apiUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  // إنشاء خطة تسويقية
  createPlan(projectId: number, plan: Partial<MarketingPlan>): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/marketing-plans`, plan);
  }

  // الحصول على الخطط التسويقية
  getPlans(projectId: number, all: boolean = false): Observable<any> {
    const url = all
      ? `${this.apiUrl}/projects/${projectId}/marketing-plans?all=true`
      : `${this.apiUrl}/projects/${projectId}/marketing-plans`;
    return this.http.get(url);
  }

  // تحديث الخطة
  updatePlan(planId: number, updates: Partial<MarketingPlan>): Observable<any> {
    return this.http.put(`${this.apiUrl}/marketing-plans/${planId}`, updates);
  }

  // حذف خطة
  deletePlan(planId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/marketing-plans/${planId}`);
  }

  // الحصول على إحصائيات الداشبورد التسويقي
  getDashboard(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/marketing-dashboard`);
  }
}
