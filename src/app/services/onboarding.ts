import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// Interface للبيانات
export interface OnboardingData {
  projectStage: string;
  mainGoal: string;
  businessField: string;
  teamSize: string;
  challenges: string[];
  goals: string[];
}

// Interface للـ Response
export interface OnboardingResponse {
  success: boolean;
  message: string;
  data: {
    project: {
      id: number;
      name: string;
      description: string;
      stage: string;
      ownerId: number;
      createdAt: string;
      updatedAt: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private apiUrl = 'http://localhost:5000/api/v1';

  constructor(private http: HttpClient) {}

  /**
   * إرسال بيانات الـ Onboarding وإنشاء مشروع جديد
   * @param data بيانات الأسئلة
   * @returns Observable<OnboardingResponse>
   */
  submitOnboarding(data: OnboardingData): Observable<OnboardingResponse> {
    console.log('📤 Sending onboarding data:', data);

    return this.http.post<OnboardingResponse>(
      `${this.apiUrl}/onboarding`,
      data
    ).pipe(
      tap(response => {
        console.log('✅ Onboarding successful:', response);
      }),
      catchError(error => {
        console.error('❌ Onboarding error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * جلب بيانات الـ Onboarding لمشروع معين (للتعديل لاحقاً)
   * @param projectId معرف المشروع
   * @returns Observable<any>
   */
  getOnboardingData(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/onboarding`).pipe(
      tap(response => {
        console.log('📥 Onboarding data retrieved:', response);
      }),
      catchError(error => {
        console.error('❌ Error retrieving onboarding data:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * تحديث بيانات الـ Onboarding
   * @param projectId معرف المشروع
   * @param data البيانات المحدثة
   * @returns Observable<any>
   */
  updateOnboarding(projectId: number, data: Partial<OnboardingData>): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/projects/${projectId}/onboarding`,
      data
    ).pipe(
      tap(response => {
        console.log('✅ Onboarding updated:', response);
      }),
      catchError(error => {
        console.error('❌ Error updating onboarding:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * حذف بيانات الـ Onboarding (إعادة تعيين)
   * @param projectId معرف المشروع
   * @returns Observable<any>
   */
  resetOnboarding(projectId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${projectId}/onboarding`).pipe(
      tap(response => {
        console.log('✅ Onboarding reset:', response);
      }),
      catchError(error => {
        console.error('❌ Error resetting onboarding:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Validate onboarding data before submission
   * @param data بيانات للتحقق منها
   * @returns boolean
   */
  validateOnboardingData(data: OnboardingData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.projectStage || data.projectStage.trim() === '') {
      errors.push('يجب اختيار مرحلة المشروع');
    }

    if (!data.mainGoal || data.mainGoal.trim() === '') {
      errors.push('يجب اختيار الهدف الرئيسي');
    }

    if (!data.businessField || data.businessField.trim() === '') {
      errors.push('يجب اختيار مجال العمل');
    }

    if (!data.teamSize || data.teamSize.trim() === '') {
      errors.push('يجب اختيار حجم الفريق');
    }

    if (!data.challenges || data.challenges.length === 0) {
      errors.push('يجب اختيار تحدي واحد على الأقل');
    }

    if (!data.goals || data.goals.length === 0) {
      errors.push('يجب اختيار هدف واحد على الأقل');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get human-readable labels for selected values
   */
  getLabels() {
    return {
      projectStages: {
        'idea': 'فكرة',
        'planning': 'تخطيط',
        'execution': 'تنفيذ',
        'operation': 'تشغيل'
      },
      goals: {
        'increase_sales': 'زيادة المبيعات',
        'brand_awareness': 'بناء الوعي بالعلامة التجارية',
        'expand_business': 'توسيع النشاط التجاري',
        'improve_operations': 'تحسين العمليات',
        'reduce_costs': 'تقليل التكاليف'
      },
      businessFields: {
        'ecommerce': 'التجارة الإلكترونية',
        'services': 'الخدمات',
        'manufacturing': 'التصنيع',
        'food': 'الطعام والمشروبات',
        'technology': 'التكنولوجيا',
        'education': 'التعليم',
        'health': 'الصحة واللياقة',
        'fashion': 'الموضة والأزياء',
        'real_estate': 'العقارات',
        'other': 'أخرى'
      },
      teamSizes: {
        'solo': 'فردي (أنا فقط)',
        'small': 'صغير (2-5 أشخاص)',
        'medium': 'متوسط (6-20 شخص)',
        'large': 'كبير (أكثر من 20 شخص)'
      },
      challenges: {
        'marketing': 'التسويق وجذب العملاء',
        'financial': 'إدارة الشؤون المالية',
        'team': 'إدارة الفريق',
        'time': 'إدارة الوقت',
        'competition': 'المنافسة في السوق',
        'technology': 'استخدام التكنولوجيا',
        'operations': 'العمليات اليومية',
        'growth': 'النمو والتوسع'
      },
      businessGoals: {
        'revenue': 'زيادة الإيرادات بنسبة محددة',
        'customers': 'زيادة عدد العملاء',
        'market_share': 'زيادة حصة السوق',
        'efficiency': 'تحسين كفاءة العمليات',
        'quality': 'تحسين جودة المنتج/الخدمة',
        'expansion': 'التوسع في أسواق جديدة',
        'brand': 'بناء علامة تجارية قوية',
        'team': 'بناء فريق عمل قوي'
      }
    };
  }

  /**
   * Convert values to human-readable format
   */
  formatOnboardingData(data: OnboardingData): any {
    const labels = this.getLabels();

    return {
      projectStage: labels.projectStages[data.projectStage as keyof typeof labels.projectStages] || data.projectStage,
      mainGoal: labels.goals[data.mainGoal as keyof typeof labels.goals] || data.mainGoal,
      businessField: labels.businessFields[data.businessField as keyof typeof labels.businessFields] || data.businessField,
      teamSize: labels.teamSizes[data.teamSize as keyof typeof labels.teamSizes] || data.teamSize,
      challenges: data.challenges.map(c => labels.challenges[c as keyof typeof labels.challenges] || c),
      goals: data.goals.map(g => labels.businessGoals[g as keyof typeof labels.businessGoals] || g)
    };
  }
}