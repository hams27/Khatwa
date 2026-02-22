import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
  standalone: true
})
export class Layout implements OnInit {

  isLoading = false;
  errorMessage = '';

  step: number = 1;
  totalSteps: number = 6;

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

  private apiUrl = 'https://khatwabackend-production.up.railway.app/api/v1';

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadProgress();
  }

  // ===== SELECTIONS =====
  selectStep(v: string) { this.selectedStep = v; this.clearError(); }
  selectGoal(v: string) { this.selectedGoal = v; this.clearError(); }
  selectField(v: string) { this.selectedField = v; this.clearError(); }
  selectTeamSize(v: string) { this.selectedTeamSize = v; this.clearError(); }

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

    // ✅ الخطوة 1: إنشاء المشروع
    const projectData = {
      name: 'مشروعي على خطوة',
      description: 'مشروع تم إنشاؤه من خلال منصة خطوة',
      industry: this.selectedField,
      stage: this.selectedStep === 'existing' ? 'operating' : 'idea'
    };

    this.http.post(`${this.apiUrl}/projects`, projectData, { headers }).subscribe({
      next: (projectRes: any) => {
        console.log('✅ تم إنشاء المشروع:', projectRes);
        const projectId = projectRes.data.id;

        // ✅ الخطوة 2: حفظ بيانات الـ onboarding
        const onboardingData = {
          teamSize: this.selectedTeamSize,
          businessModel: this.selectedGoal,
          currentChallenges: this.challenges,
          shortTermGoals: this.goals,
          longTermGoals: this.goals
        };

        this.http.post(
          `${this.apiUrl}/projects/${projectId}/onboarding`,
          onboardingData,
          { headers }
        ).subscribe({
          next: (res: any) => {
            console.log('✅ تم حفظ الـ onboarding:', res);
            this.clearProgress();
            this.isLoading = false;

            // ✅ روح للداشبورد
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            console.error('❌ خطأ في الـ onboarding:', err);
            // روح للداشبورد حتى لو فشل الـ onboarding
            this.clearProgress();
            this.isLoading = false;
            this.router.navigate(['/dashboard']);
          }
        });
      },
      error: (err) => {
        console.error('❌ خطأ في إنشاء المشروع:', err);
        this.isLoading = false;

        if (err.status === 401) {
          // الـ token انتهى، ارجع للـ register
          this.router.navigate(['/register']);
        } else {
          this.showError('حدث خطأ، جاري التوجيه للداشبورد...');
          setTimeout(() => this.router.navigate(['/dashboard']), 2000);
        }
      }
    });
  }

  // ===== VALIDATION =====
  validateCurrentStep(): boolean {
    switch (this.step) {
      case 1: return this.selectedStep !== '';
      case 2: return this.selectedGoal !== '';
      case 3: return this.selectedField !== '';
      case 4: return this.selectedTeamSize !== '';
      case 5: return this.challenges.length > 0;
      case 6: return this.goals.length > 0;
      default: return true;
    }
  }

  getProgress(): number { return Math.round((this.step / this.totalSteps) * 100); }

  getStepName(): string {
    const names = ['مرحلة المشروع', 'الهدف الرئيسي', 'مجال العمل', 'حجم الفريق', 'التحديات', 'الأهداف'];
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
    localStorage.setItem('onboarding_progress', JSON.stringify({
      step: this.step,
      selectedStep: this.selectedStep,
      selectedGoal: this.selectedGoal,
      selectedField: this.selectedField,
      selectedTeamSize: this.selectedTeamSize,
      challenges: this.challenges,
      goals: this.goals
    }));
  }

  loadProgress() {
    const saved = localStorage.getItem('onboarding_progress');
    if (!saved) return;
    try {
      const p = JSON.parse(saved);
      this.step = p.step || 1;
      this.selectedStep = p.selectedStep || '';
      this.selectedGoal = p.selectedGoal || '';
      this.selectedField = p.selectedField || '';
      this.selectedTeamSize = p.selectedTeamSize || '';
      this.challenges = p.challenges || [];
      this.goals = p.goals || [];
    } catch { this.clearProgress(); }
  }

  clearProgress() { localStorage.removeItem('onboarding_progress'); }
}