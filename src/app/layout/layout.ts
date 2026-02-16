import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// Interface للبيانات
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
  
  // حالة التحميل والأخطاء
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Current step tracker
  step: number = 1;
  totalSteps: number = 6;
  
  // Step 1: Project Stage
  selectedStep: string = '';
  stepOptions = [
    { value: 'idea', label: 'فكرة', icon: '💡', description: 'لديك فكرة مشروع تريد تنفيذها' },
    { value: 'planning', label: 'تخطيط', icon: '📋', description: 'تعمل على التخطيط للمشروع' },
    { value: 'execution', label: 'تنفيذ', icon: '🚀', description: 'بدأت في تنفيذ المشروع' },
    { value: 'operation', label: 'تشغيل', icon: '⚙️', description: 'المشروع يعمل بالفعل' }
  ];
  
  // Step 2: Main Goal
  selectedGoal: string = '';
  goalOptions = [
    { value: 'increase_sales', label: 'زيادة المبيعات', icon: '📈' },
    { value: 'brand_awareness', label: 'بناء الوعي بالعلامة التجارية', icon: '🎯' },
    { value: 'expand_business', label: 'توسيع النشاط التجاري', icon: '🌍' },
    { value: 'improve_operations', label: 'تحسين العمليات', icon: '⚡' },
    { value: 'reduce_costs', label: 'تقليل التكاليف', icon: '💰' }
  ];
  
  // Step 3: Business Field
  selectedField: string = '';
  fieldOptions = [
    { value: 'ecommerce', label: 'التجارة الإلكترونية', icon: '🛒' },
    { value: 'services', label: 'الخدمات', icon: '🤝' },
    { value: 'manufacturing', label: 'التصنيع', icon: '🏭' },
    { value: 'food', label: 'الطعام والمشروبات', icon: '🍔' },
    { value: 'technology', label: 'التكنولوجيا', icon: '💻' },
    { value: 'education', label: 'التعليم', icon: '📚' },
    { value: 'health', label: 'الصحة واللياقة', icon: '🏥' },
    { value: 'fashion', label: 'الموضة والأزياء', icon: '👗' },
    { value: 'real_estate', label: 'العقارات', icon: '🏘️' },
    { value: 'other', label: 'أخرى', icon: '📦' }
  ];
  
  // Step 4: Team Size
  selectedTeamSize: string = '';
  teamSizeOptions = [
    { value: 'solo', label: 'فردي', icon: '👤', description: 'أنا فقط' },
    { value: 'small', label: 'صغير', icon: '👥', description: '2-5 أشخاص' },
    { value: 'medium', label: 'متوسط', icon: '👨‍👩‍👧‍👦', description: '6-20 شخص' },
    { value: 'large', label: 'كبير', icon: '🏢', description: 'أكثر من 20 شخص' }
  ];
  
  // Step 5: Current Challenges (multiple selection)
  challenges: string[] = [];
  challengeOptions = [
    { value: 'marketing', label: 'التسويق وجذب العملاء', icon: '📢' },
    { value: 'financial', label: 'إدارة الشؤون المالية', icon: '💵' },
    { value: 'team', label: 'إدارة الفريق', icon: '👥' },
    { value: 'time', label: 'إدارة الوقت', icon: '⏰' },
    { value: 'competition', label: 'المنافسة في السوق', icon: '🎯' },
    { value: 'technology', label: 'استخدام التكنولوجيا', icon: '💻' },
    { value: 'operations', label: 'العمليات اليومية', icon: '⚙️' },
    { value: 'growth', label: 'النمو والتوسع', icon: '📈' }
  ];
  
  // Step 6: Goals (multiple selection)
  goals: string[] = [];
  goalsOptions = [
    { value: 'revenue', label: 'زيادة الإيرادات بنسبة محددة', icon: '💰' },
    { value: 'customers', label: 'زيادة عدد العملاء', icon: '👥' },
    { value: 'market_share', label: 'زيادة حصة السوق', icon: '📊' },
    { value: 'efficiency', label: 'تحسين كفاءة العمليات', icon: '⚡' },
    { value: 'quality', label: 'تحسين جودة المنتج/الخدمة', icon: '⭐' },
    { value: 'expansion', label: 'التوسع في أسواق جديدة', icon: '🌍' },
    { value: 'brand', label: 'بناء علامة تجارية قوية', icon: '🎯' },
    { value: 'team', label: 'بناء فريق عمل قوي', icon: '🤝' }
  ];
  
  // API URL
  private apiUrl = 'http://localhost:5000/api/v1';
  
  constructor(
    private router: Router,
    private http: HttpClient
  ) {}
  
  ngOnInit() {
    // يمكن إضافة أي initialization هنا
    this.loadProgress();
  }
  
  // Step 1 Functions
  selectStep(stepType: string) {
    this.selectedStep = stepType;
    this.clearError();
  }
  
  // Step 2 Functions
  selectGoal(goal: string) {
    this.selectedGoal = goal;
    this.clearError();
  }
  
  // Step 3 Functions
  selectField(field: string) {
    this.selectedField = field;
    this.clearError();
  }
  
  // Step 4 Functions
  selectTeamSize(size: string) {
    this.selectedTeamSize = size;
    this.clearError();
  }
  
  // Step 5 Functions - Toggle multiple challenges
  toggleChallenge(challenge: string) {
    const index = this.challenges.indexOf(challenge);
    if (index > -1) {
      // Remove if already selected
      this.challenges.splice(index, 1);
    } else {
      // Add if not selected
      this.challenges.push(challenge);
    }
    this.clearError();
  }
  
  // Check if challenge is selected
  isChallengeSelected(challenge: string): boolean {
    return this.challenges.includes(challenge);
  }
  
  // Step 6 Functions - Toggle multiple goals
  toggleGoal(goal: string) {
    const index = this.goals.indexOf(goal);
    if (index > -1) {
      // Remove if already selected
      this.goals.splice(index, 1);
    } else {
      // Add if not selected
      this.goals.push(goal);
    }
    this.clearError();
  }
  
  // Check if goal is selected
  isGoalSelected(goal: string): boolean {
    return this.goals.includes(goal);
  }
  
  // Navigation Functions
  nextStep() {
    // Validation before moving to next step
    if (this.validateCurrentStep()) {
      if (this.step < this.totalSteps) {
        this.step++;
        // Scroll to top when moving to next step
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Save progress
        this.saveProgress();
      }
    } else {
      // Show error message
      this.showError('الرجاء اختيار إجابة قبل المتابعة');
    }
  }
  
  goBack() {
    if (this.step > 1) {
      this.step--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.clearError();
    }
  }
  
  // Skip step (للخطوات الاختيارية)
  skipStep() {
    if (this.step < this.totalSteps) {
      this.step++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  // Validation
  validateCurrentStep(): boolean {
    switch(this.step) {
      case 1:
        return this.selectedStep !== '';
      case 2:
        return this.selectedGoal !== '';
      case 3:
        return this.selectedField !== '';
      case 4:
        return this.selectedTeamSize !== '';
      case 5:
        return this.challenges.length > 0;
      case 6:
        return this.goals.length > 0;
      default:
        return true;
    }
  }
  
  // Get current step validation status
  isCurrentStepValid(): boolean {
    return this.validateCurrentStep();
  }
  
  // Progress calculation
  getProgress(): number {
    return Math.round((this.step / this.totalSteps) * 100);
  }
  
  // Get all collected data
  getOnboardingData(): OnboardingData {
    return {
      projectStage: this.selectedStep,
      mainGoal: this.selectedGoal,
      businessField: this.selectedField,
      teamSize: this.selectedTeamSize,
      challenges: this.challenges,
      goals: this.goals
    };
  }
  
  // Save onboarding data and create project
  saveOnboardingData() {
    // Validate last step
    if (!this.validateCurrentStep()) {
      this.showError('الرجاء اختيار إجابة قبل الإنهاء');
      return;
    }
    
    const data = this.getOnboardingData();
    
    // Show loading state
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    console.log('📤 إرسال البيانات:', data);
    
    // Send data to backend
    this.http.post(`${this.apiUrl}/onboarding`, data).subscribe({
      next: (response: any) => {
        console.log('✅ نجح الحفظ:', response);
        
        // Show success message
        this.successMessage = 'تم إنشاء مشروعك بنجاح! جاري التوجيه...';
        
        // Clear local storage
        this.clearProgress();
        
        // Navigate to dashboard after short delay
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (error) => {
        console.error('❌ خطأ في الحفظ:', error);
        
        // Show user-friendly error message
        let errorMsg = 'حدث خطأ، الرجاء المحاولة مرة أخرى';
        
        if (error.status === 401) {
          errorMsg = 'انتهت جلستك. الرجاء تسجيل الدخول مرة أخرى';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else if (error.status === 400) {
          errorMsg = 'البيانات المدخلة غير صحيحة';
        } else if (error.status === 500) {
          errorMsg = 'خطأ في الخادم. الرجاء المحاولة لاحقاً';
        }
        
        this.showError(errorMsg);
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
  
  // Error handling
  showError(message: string) {
    this.errorMessage = message;
    // Auto hide after 5 seconds
    setTimeout(() => {
      this.clearError();
    }, 5000);
  }
  
  clearError() {
    this.errorMessage = '';
  }
  
  // Save progress to localStorage
  saveProgress() {
    const progress = {
      step: this.step,
      selectedStep: this.selectedStep,
      selectedGoal: this.selectedGoal,
      selectedField: this.selectedField,
      selectedTeamSize: this.selectedTeamSize,
      challenges: this.challenges,
      goals: this.goals
    };
    localStorage.setItem('onboarding_progress', JSON.stringify(progress));
  }
  
  // Load progress from localStorage
  loadProgress() {
    const savedProgress = localStorage.getItem('onboarding_progress');
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress);
        this.step = progress.step || 1;
        this.selectedStep = progress.selectedStep || '';
        this.selectedGoal = progress.selectedGoal || '';
        this.selectedField = progress.selectedField || '';
        this.selectedTeamSize = progress.selectedTeamSize || '';
        this.challenges = progress.challenges || [];
        this.goals = progress.goals || [];
        
        console.log('📥 تم استرجاع التقدم المحفوظ');
      } catch (e) {
        console.error('خطأ في تحميل التقدم المحفوظ:', e);
        this.clearProgress();
      }
    }
  }
  
  // Clear saved progress
  clearProgress() {
    localStorage.removeItem('onboarding_progress');
  }
  
  // Reset all data
  resetOnboarding() {
    if (confirm('هل أنت متأكد من إعادة تعيين كل البيانات؟')) {
      this.step = 1;
      this.selectedStep = '';
      this.selectedGoal = '';
      this.selectedField = '';
      this.selectedTeamSize = '';
      this.challenges = [];
      this.goals = [];
      this.clearProgress();
      this.clearError();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  // Get step name for display
  getStepName(): string {
    const stepNames = [
      'مرحلة المشروع',
      'الهدف الرئيسي',
      'مجال العمل',
      'حجم الفريق',
      'التحديات',
      'الأهداف'
    ];
    return stepNames[this.step - 1] || '';
  }
  
  // Check if it's the last step
  isLastStep(): boolean {
    return this.step === this.totalSteps;
  }
  
  // Check if it's the first step
  isFirstStep(): boolean {
    return this.step === 1;
  }
}