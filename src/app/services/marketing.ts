import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MarketingPlan {
  id?: number;
  projectId: number;
  objectives: string;
  targetAudience?: string;
  channels?: any;
  budget?: number;
  timeline?: string;
  contentStrategy?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MarketingService {
  private apiUrl = 'http://localhost:5000/api/v1';

  constructor(private http: HttpClient) {}

  // إنشاء خطة تسويقية
  createPlan(projectId: number, plan: MarketingPlan): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/marketing-plans`, plan);
  }

  // الحصول على الخطط التسويقية
  getPlans(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/marketing-plans`);
  }

  // تحديث الخطة
  updatePlan(planId: number, updates: Partial<MarketingPlan>): Observable<any> {
    return this.http.put(`${this.apiUrl}/marketing-plans/${planId}`, updates);
  }

  // حذف خطة
  deletePlan(planId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/marketing-plans/${planId}`);
  }
}