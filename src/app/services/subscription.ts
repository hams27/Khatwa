import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Subscription {
  id?: number;
  userId?: number;
  planType: 'free' | 'pro' | 'business';
  status: 'active' | 'cancelled' | 'expired';
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = 'http://localhost:5000/api/v1/subscriptions';

  constructor(private http: HttpClient) {}

  // الحصول على الاشتراك الحالي
  getCurrentSubscription(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // ترقية/تغيير الاشتراك
  updateSubscription(planType: string): Observable<any> {
    return this.http.put(this.apiUrl, { planType });
  }

  // إلغاء الاشتراك
  cancelSubscription(): Observable<any> {
    return this.http.delete(this.apiUrl);
  }
}