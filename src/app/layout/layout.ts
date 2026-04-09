import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, finalize, firstValueFrom, of, timeout } from 'rxjs';
import { AuthService } from '../services/auth';
import { AiService } from '../services/ai';
import { API_BASE_URL } from '../config/api';

export interface OnboardingData {
  projectStage: string;
  mainGoal: string;
  businessField: string;
  teamSize: string;
  challenges: string[];
  goals: string[];
}

@Component({
  selector: 'app-layout',
  imports: [CommonModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  standalone: true
})
export class Layout implements OnInit {

  isLoading = false;
  errorMessage = '';

  step: number = 1;
  totalSteps: number = 7;

  projectName: string = '';
  projectDescription: string = '';
  projectLogoFile: File | null = null;
  projectLogoPreviewUrl: string | null = null;

  // Step 1
  selectedStep: string = '';

  // Step 2
  selectedGoal: string = '';

  // Step 3
  selectedField: string = '';

  // Step 4
  selectedTeamSize: string = '';

  // Step 5
  challenges: string[] = [];

  // Step 6
  goals: string[] = [];

  createdProjectId: number | null = null;

  private apiUrl = API_BASE_URL;

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private aiService: AiService
  ) {}

  ngOnInit() {
    // امسح أي progress قديم مرتبط بـ guest أو sessions سابقة
    localStorage.removeItem('onboarding_progress_guest');

    this.loadProgress();
    if (!this.step || this.step < 1) this.step = 1;
  }

  /** يرجع مفتاح فريد لكل مستخدم بناءً على user id أو email */
  private get progressKey(): string {
    const user = this.authService.currentUserValue;
    const uid  = user?.id ?? user?.email ?? 'guest';
    return `onboarding_progress_${uid}`;
  }

  // ===== SELECTIONS =====
  selectStep(v: string) { this.selectedStep = v; this.clearError(); }
  selectGoal(v: string) { this.selectedGoal = v; this.clearError(); }
  selectField(v: string) { this.selectedField = v; this.clearError(); }
  selectTeamSize(v: string) { this.selectedTeamSize = v; this.clearError(); }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.projectLogoFile = file;

    if (this.projectLogoPreviewUrl) {
      URL.revokeObjectURL(this.projectLogoPreviewUrl);
      this.projectLogoPreviewUrl = null;
    }
    if (file) {
      this.projectLogoPreviewUrl = URL.createObjectURL(file);
    }
    this.clearError();
  }

  toggleChallenge(v: string) {
    const i = this.challenges.indexOf(v);
    if (i > -1) this.challenges.splice(i, 1);
    else this.challenges.push(v);
    this.clearError();
  }
  isChallengeSelected(v: string) { return this.challenges.includes(v); }

  toggleGoal(v: string) {
    const i = this.goals.indexOf(v);
    if (i > -1) this.goals.splice(i, 1);
    else this.goals.push(v);
    this.clearError();
  }
  isGoalSelected(v: string) { return this.goals.includes(v); }

  // ===== NAVIGATION =====
  nextStep() {
    if (!this.validateCurrentStep()) {
      this.showError('الرجاء اختيار إجابة قبل المتابعة');
      return;
    }

    this.saveProgress();

    if (this.step < this.totalSteps) {
      this.step++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // ✅ آخر خطوة — ابعت للـ backend مباشرة
      this.finishOnboarding();
    }
  }

  goBack() {
    if (this.step > 1) {
      this.step--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.clearError();
    }
  }

  // ✅ بعت الداتا للـ backend مباشرة لأن المستخدم عنده token
  finishOnboarding() {
    const token = localStorage.getItem('token');

    if (!token) {
      // لو مفيش token، ارجع للـ register
      this.router.navigate(['/register']);
      return;
    }

    this.isLoading = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const runAnalysis = (projectId: number) => {
      const analysisData = {
        projectId: projectId,
        stage: this.selectedStep === 'existing' ? 'operating' : 'idea',
        industry: this.selectedField,
        teamSize: this.selectedTeamSize,
        primaryGoal: this.selectedGoal,
        challenges: this.challenges,
        goals: this.goals
      };

      this.aiService
        .analyzeOnboarding(analysisData)
        .pipe(
          timeout(90000),
          finalize(() => {
            this.isLoading = false;
          })
        )
        .subscribe({
        next: (res: any) => {
          console.log('✅ تم تحليل الـ Onboarding ورسم خارطة الطريق:', res);
          this.clearProgress();
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          console.error('❌ خطأ في تحليل الـ Onboarding:', err);
          if (err?.name === 'TimeoutError') {
            this.showError('التحليل أخذ وقتًا أطول من المتوقع. حاول مرة أخرى.');
            return;
          }
          this.showError('تعذر حفظ بيانات الـ onboarding. تأكد من تشغيل السيرفر ثم حاول مرة أخرى.');
        }
      });
    };

    if (this.createdProjectId) {
      runAnalysis(this.createdProjectId);
      return;
    }

    // ✅ الخطوة 1: إنشاء المشروع
    const projectData = {
      name: (this.projectName || '').trim() || 'مشروعي على خطوة',
      description: (this.projectDescription || '').trim() || 'مشروع تم إنشاؤه من خلال منصة خطوة',
      industry: this.selectedField,
      stage: this.selectedStep === 'existing' ? 'operating' : 'idea'
    };

    this.http
      .post(`${this.apiUrl}/projects`, projectData, { headers })
      .pipe(timeout(30000))
      .subscribe({
      next: (projectRes: any) => {
        console.log('✅ تم إنشاء المشروع:', projectRes);
        const projectId = projectRes?.data?.id;
        if (!projectId) {
          this.isLoading = false;
          this.showError('تم إنشاء المشروع لكن لم يتم استلام رقم المشروع من السيرفر. حاول مرة أخرى.');
          return;
        }

        this.createdProjectId = projectId;
        this.saveProgress();

        const uploadLogoIfNeeded = async () => {
          if (!this.projectLogoFile) return;
          const formData = new FormData();
          formData.append('logo', this.projectLogoFile);

          await firstValueFrom(
            this.http
              .post(`${this.apiUrl}/projects/${projectId}/logo`, formData, { headers })
              .pipe(
                timeout(20000),
                catchError(() => of(null))
              )
          );
        };

        Promise.resolve()
          .then(uploadLogoIfNeeded)
          .catch(() => {})
          .finally(() => runAnalysis(projectId));
      },
      error: (err) => {
        console.error('❌ خطأ في إنشاء المشروع:', err);
        this.isLoading = false;

        if (err?.name === 'TimeoutError') {
          this.showError('إنشاء المشروع أخذ وقتًا أطول من المتوقع. حاول مرة أخرى.');
          return;
        }

        if (err.status === 401) {
          // الـ token انتهى، ارجع للـ register
          this.router.navigate(['/register']);
        } else {
          this.showError('تعذر إنشاء المشروع. تأكد من تشغيل السيرفر ثم حاول مرة أخرى.');
        }
      }
    });
  }

  // ===== VALIDATION =====
  validateCurrentStep(): boolean {
    switch (this.step) {
      case 1: return this.selectedStep !== '';
      case 2: return (this.projectName || '').trim().length > 0;
      case 3: return this.selectedGoal !== '';
      case 4: return this.selectedField !== '';
      case 5: return this.selectedTeamSize !== '';
      case 6: return this.challenges.length > 0;
      case 7: return this.goals.length > 0;
      default: return true;
    }
  }

  getProgress(): number { return Math.round((this.step / this.totalSteps) * 100); }

  getStepName(): string {
    const names = ['مرحلة المشروع', 'بيانات المشروع', 'الهدف الرئيسي', 'مجال العمل', 'حجم الفريق', 'التحديات', 'الأهداف'];
    return names[this.step - 1] || '';
  }

  isLastStep(): boolean { return this.step === this.totalSteps; }
  isFirstStep(): boolean { return this.step === 1; }

  // ===== ERROR =====
  showError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.clearError(), 5000);
  }
  clearError() { this.errorMessage = ''; }

  // ===== PROGRESS =====
  saveProgress() {
    localStorage.setItem(this.progressKey, JSON.stringify({
      step: this.step,
      projectName: this.projectName,
      projectDescription: this.projectDescription,
      selectedStep: this.selectedStep,
      selectedGoal: this.selectedGoal,
      selectedField: this.selectedField,
      selectedTeamSize: this.selectedTeamSize,
      challenges: this.challenges,
      goals: this.goals,
      createdProjectId: this.createdProjectId
    }));
  }

  loadProgress() {
    const saved = localStorage.getItem(this.progressKey);
    if (!saved) return;
    try {
      const p = JSON.parse(saved);
      this.step            = p.step            || 1;
      this.projectName     = p.projectName     || '';
      this.projectDescription = p.projectDescription || '';
      this.selectedStep    = p.selectedStep    || '';
      this.selectedGoal    = p.selectedGoal    || '';
      this.selectedField   = p.selectedField   || '';
      this.selectedTeamSize= p.selectedTeamSize|| '';
      this.challenges      = p.challenges      || [];
      this.goals           = p.goals           || [];
      this.createdProjectId = p.createdProjectId ?? null;
    } catch { this.clearProgress(); }
  }

  clearProgress() {
    localStorage.removeItem(this.progressKey);
    // امسح أي keys قديمة غير مرتبطة بـ user (من الإصدار السابق)
    localStorage.removeItem('onboarding_progress');
    this.createdProjectId = null;
    if (this.projectLogoPreviewUrl) {
      URL.revokeObjectURL(this.projectLogoPreviewUrl);
      this.projectLogoPreviewUrl = null;
    }
    this.projectLogoFile = null;
  }
}
