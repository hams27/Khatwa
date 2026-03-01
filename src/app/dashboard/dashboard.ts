import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth';
import { ProjectService, Project } from '../services/project';
import { TaskService } from '../services/task';
import { FinanceService } from '../services/finance';
import { Subject, takeUntil, forkJoin, timeout, catchError, of } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { AiChatComponent } from '../ai-chat/ai-chat';

// تسجيل مكونات Chart.js
Chart.register(...registerables);

// ─── Interfaces ───────────────────────────────────────────

interface ProgressStep {
  title: string;
  description: string;
  done: boolean;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  projectId?: number;
  assignedTo?: number;
  createdAt?: string;
}

interface AIInsight {
  type: 'success' | 'warning' | 'info';
  message: string;
  action?: string;
  actionLabel?: string;
}

interface Activity {
  type: 'task' | 'finance' | 'team' | 'project';
  message: string;
  timestamp: Date;
}

// ─── Component ────────────────────────────────────────────

@Component({
  selector: 'app-dashboard',
  imports: [SideBar, CommonModule, AiChatComponent, RouterLink, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  standalone: true
})
export class Dashboard implements OnInit, OnDestroy, AfterViewInit {

  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;

  // ── Sidebar ──────────────────────────────────────────────
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  // ── Chart Refs & Instances ───────────────────────────────
  @ViewChild('tasksProgressChart') tasksProgressChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('miniFinanceChart')   miniFinanceChart?:   ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChart')      activityChart?:      ElementRef<HTMLCanvasElement>;

  private tasksChart?:           Chart;
  private financeChart?:         Chart;
  private activityChartInstance?: Chart;

  // ── User Info ────────────────────────────────────────────
  // Endpoint: AuthService.currentUserValue (local storage / JWT)
  currentUser: any = null;
  userName: string = 'المستخدم';
  userPoints: number = 0;
  userLevel: number = 1;

  // ── Loading States ───────────────────────────────────────
  isInitialLoading = true;
  projectsLoading  = true;
  tasksLoading     = true;
  financeLoading   = true;
  chartsLoading    = false;

  // ── UI State ─────────────────────────────────────────────
  showGuide = false;
  isSidebarCollapsed = false;

  // ── Projects ─────────────────────────────────────────────
  // Endpoint: GET /projects  →  ProjectService.getProjects()
  projects: Project[] = [];
  totalProjects  = 0;
  activeProjects = 0;
  currentProject: Project | null = null;

  // ── Tasks ─────────────────────────────────────────────────
  // Endpoint: GET /tasks?projectId=:id  →  TaskService.getTasks(projectId)
  totalTasks      = 0;
  completedTasks  = 0;
  pendingTasks    = 0;
  inProgressTasks = 0;
  tasksProgress   = 0;
  upcomingTasks: Task[] = [];

  // ── Finance ───────────────────────────────────────────────
  // Endpoint: GET /finance/summary?projectId=:id  →  FinanceService.getSummary(projectId)
  totalRevenue    = 0;
  totalExpenses   = 0;
  profit          = 0;
  profitMargin    = 0;
  revenueChange   = 0;
  expensesChange  = 0;

  // ── Project Progress ──────────────────────────────────────
  // يُحسب من progressSteps المكتملة  (بدون Endpoint منفصل)
  projectProgress = 0;
  progressSteps: ProgressStep[] = [
    { title: 'إنشاء المشروع',       description: 'قم بإنشاء مشروعك الأول',             done: false },
    { title: 'إضافة خطة تسويقية',  description: 'ابدأ بخطة تسويقية مخصصة',            done: false },
    { title: 'إضافة فريق العمل',   description: 'دعوة أعضاء الفريق للتعاون',          done: false }
  ];

  // ── AI Insights ───────────────────────────────────────────
  // مُولَّدة محلياً في generateAIInsights() بناءً على بيانات Tasks + Finance + Projects
  aiInsights: AIInsight[] = [];

  // ── Recent Activities ─────────────────────────────────────
  // مُولَّدة محلياً في generateRecentActivities() بناءً على بيانات Projects + Tasks + Finance
  recentActivities: Activity[] = [];

  // ── Weekly Activity (للـ Chart) ───────────────────────────
  // محسوبة من TaskService → calculateWeeklyActivity()
  weeklyActivity: number[] = [0, 0, 0, 0, 0, 0, 0];

  // ─── Constructor ────────────────────────────────────────────

  constructor(
    private router:         Router,
    private authService:    AuthService,
    private projectService: ProjectService,
    private taskService:    TaskService,
    private financeService: FinanceService,
    private cdr:            ChangeDetectorRef
  ) {}

  // ─── Lifecycle ──────────────────────────────────────────────

  ngOnInit() {
    this.loadUserData();
    this.loadDashboardData();
  }

  ngAfterViewInit() {
    // الـ Charts تُنشأ بعد اكتمال تحميل الـ DOM
    setTimeout(() => this.createAllCharts(), 100);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  // ─── Sidebar ────────────────────────────────────────────────

  onSidebarToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  openSidebar() {
    this.sidebarComponent?.openMobile();
  }

  // ─── User Data ──────────────────────────────────────────────

  /**
   * يجلب بيانات المستخدم الحالي من AuthService (JWT / localStorage)
   * يشترك على currentUser Observable — يتحدث فور رجوع getProfile() من الباك
   */
  loadUserData() {
    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user?.name) {
          this.currentUser = user;
          this.userName = user.name;
          this.calculateUserLevel();
          this.cdr.detectChanges();
        }
      });
  }

  calculateUserLevel() {
    const projectPoints = this.totalProjects * 10;
    const taskPoints    = this.completedTasks * 5;
    this.userPoints = projectPoints + taskPoints + this.recentActivities.length;
    this.userLevel  = Math.floor(this.userPoints / 100) + 1;
  }

  // ─── Dashboard Data ──────────────────────────────────────────

  /**
   * Endpoint: GET /projects
   * Service:  ProjectService.getProjects()
   * يجلب قائمة المشاريع ثم يستدعي loadProjectData() للمشروع الأول
   */
  loadDashboardData() {
    this.isInitialLoading = true;

    this.projectService.getProjects()
      .pipe(
        timeout(5000),
        catchError(error => {
          console.error('Error loading projects:', error);
          return of({ success: false, data: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: any) => {
          this.isInitialLoading  = false;
          this.projectsLoading   = false;

          if (response?.success && response.data?.length) {
            this.projects       = response.data;
            this.totalProjects  = this.projects.length;
            this.activeProjects = this.projects.filter((p: Project) =>
              p.stage === 'execution' || p.stage === 'planning'
            ).length;

            this.progressSteps[0].done = true;
            this.projectProgress       = 33;
            this.currentProject        = this.projects[0];

            this.loadProjectData(this.currentProject.id!);
          } else {
            // لا توجد مشاريع — أوقف جميع حالات التحميل
            this.tasksLoading   = false;
            this.financeLoading = false;
            this.chartsLoading  = false;
          }
        },
        error: () => {
          this.isInitialLoading  = false;
          this.projectsLoading   = false;
          this.tasksLoading      = false;
          this.financeLoading    = false;
          this.chartsLoading     = false;
        }
      });
  }

  /**
   * Endpoints (parallel via forkJoin):
   *   GET /tasks?projectId=:id       →  TaskService.getTasks(projectId)
   *   GET /finance/summary/:id       →  FinanceService.getSummary(projectId)
   * يُشغَّل بعد loadDashboardData() لجلب بيانات المشروع المحدد
   */
  loadProjectData(projectId: number) {
    forkJoin({
      tasks: this.taskService.getTasks(projectId).pipe(
        timeout(5000),
        catchError(err => {
          console.error('Tasks error:', err);
          return of({ success: false, data: [] });
        })
      ),
      finance: this.financeService.getSummary(projectId).pipe(
        timeout(5000),
        catchError(err => {
          console.error('Finance error:', err);
          return of({ success: false, data: null });
        })
      )
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (results) => {
        // معالجة المهام
        if (results.tasks?.success && results.tasks.data) {
          this.processTasks(results.tasks.data);
        }
        this.tasksLoading = false;

        // معالجة المالية
        if (results.finance?.success && results.finance.data) {
          this.processFinance(results.finance.data);
        }
        this.financeLoading = false;

        // توليد الـ Insights والأنشطة بعد اكتمال البيانات
        this.generateAIInsights();
        this.generateRecentActivities();
        this.calculateUserLevel();

        // إنشاء الـ Charts بعد اكتمال البيانات
        this.chartsLoading = false;
        setTimeout(() => this.createAllCharts(), 100);
      },
      error: () => {
        this.tasksLoading   = false;
        this.financeLoading = false;
        this.chartsLoading  = false;
      }
    });
  }

  // ─── Data Processing ────────────────────────────────────────

  /**
   * يعالج بيانات المهام القادمة من TaskService.getTasks()
   * يُعبِّئ: totalTasks, completedTasks, inProgressTasks, pendingTasks,
   *          tasksProgress, upcomingTasks[], weeklyActivity[]
   */
  processTasks(tasks: any[]) {
    this.totalTasks      = tasks.length;
    this.completedTasks  = tasks.filter(t => t.status === 'done').length;
    this.inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    this.pendingTasks    = tasks.filter(t => t.status === 'todo').length;

    if (this.totalTasks > 0) {
      this.tasksProgress = Math.round((this.completedTasks / this.totalTasks) * 100);

      // تحقق من وجود مهام تسويقية لتحديث progressSteps[1]
      const hasMarketingTasks = tasks.some(t =>
        t.title?.includes('تسويق') || t.description?.includes('تسويق')
      );
      if (hasMarketingTasks) {
        this.progressSteps[1].done = true;
        this.projectProgress       = Math.max(this.projectProgress, 66);
      }
    }

    // المهام غير المكتملة مرتبة حسب تاريخ الاستحقاق (أول 5)
    this.upcomingTasks = tasks
      .filter(t => t.status !== 'done')
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 5)
      .map(t => ({
        id:          t.id,
        title:       t.title,
        description: t.description,
        status:      t.status,
        priority:    t.priority || 'medium',
        dueDate:     t.dueDate ? new Date(t.dueDate) : undefined,
        createdAt:   t.createdAt
      }));

    this.calculateWeeklyActivity(tasks);
  }

  /**
   * يعالج بيانات المالية القادمة من FinanceService.getSummary()
   * يُعبِّئ: totalRevenue, totalExpenses, profit, profitMargin,
   *          revenueChange, expensesChange
   */
  processFinance(data: any) {
    this.totalRevenue   = data.totalRevenue   || 0;
    this.totalExpenses  = data.totalExpenses  || 0;
    this.profit         = this.totalRevenue - this.totalExpenses;

    if (this.totalRevenue > 0) {
      this.profitMargin = Math.round((this.profit / this.totalRevenue) * 100);
    }

    // TODO: احسب revenueChange و expensesChange من بيانات الشهر السابق عند توفرها من الـ API
    this.revenueChange  = data.revenueChange  || 0;
    this.expensesChange = data.expensesChange || 0;
  }

  /**
   * يحسب عدد المهام المكتملة لكل يوم من آخر 7 أيام
   * يُعبِّئ: weeklyActivity[] (مستخدم في chart نشاط الأسبوع)
   */
  calculateWeeklyActivity(tasks: Task[]) {
    const now       = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);

    this.weeklyActivity = [0, 0, 0, 0, 0, 0, 0];

    tasks
      .filter(t => t.status === 'done' && t.createdAt)
      .forEach(task => {
        const taskDate = new Date(task.createdAt!);
        if (taskDate >= weekStart && taskDate <= now) {
          const dayIndex = Math.floor(
            (taskDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (dayIndex >= 0 && dayIndex < 7) {
            this.weeklyActivity[dayIndex]++;
          }
        }
      });
  }

  // ─── Charts ──────────────────────────────────────────────────

  createAllCharts() {
    this.createTasksProgressChart();
    this.createMiniFinanceChart();
    this.createActivityChart();
  }

  /**
   * Chart: Donut — تقدم المهام
   * البيانات: completedTasks, inProgressTasks, pendingTasks (من TaskService)
   */
  createTasksProgressChart() {
    if (!this.tasksProgressChart) return;
    const ctx = this.tasksProgressChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.tasksChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['مكتملة', 'قيد التنفيذ', 'معلقة'],
        datasets: [{
          data: [this.completedTasks, this.inProgressTasks, this.pendingTasks],
          backgroundColor: ['#1f9950', '#ffa726', '#d4e8db'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Cairo', size: 12 }, padding: 15, usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v     = ctx.parsed || 0;
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct   = total > 0 ? ((v / total) * 100).toFixed(0) : '0';
                return ` ${ctx.label}: ${v} مهمة (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Chart: Bar — الملخص المالي
   * البيانات: totalRevenue, totalExpenses, profit (من FinanceService)
   */
  createMiniFinanceChart() {
    if (!this.miniFinanceChart) return;
    const ctx = this.miniFinanceChart.nativeElement.getContext('2d');
    if (!ctx) return;

    this.financeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['الإيرادات', 'المصروفات', 'الأرباح'],
        datasets: [{
          data: [this.totalRevenue, this.totalExpenses, this.profit],
          backgroundColor: [
            'rgba(31, 153, 80, 0.85)',
            'rgba(239, 83, 80, 0.8)',
            'rgba(30, 136, 229, 0.85)'
          ],
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${(ctx.parsed.y || 0).toLocaleString('ar-SA')} ر.س`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: { font: { family: 'Cairo', size: 10 }, callback: v => `${Number(v) / 1000}k` }
          }
        }
      }
    });
  }

  /**
   * Chart: Line — نشاط الأسبوع
   * البيانات: weeklyActivity[] (من TaskService → calculateWeeklyActivity)
   */
  createActivityChart() {
    if (!this.activityChart) return;
    const ctx = this.activityChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, 'rgba(31,153,80,.2)');
    grad.addColorStop(1, 'rgba(31,153,80,0)');

    this.activityChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
        datasets: [{
          label: 'المهام المكتملة',
          data: this.weeklyActivity,
          borderColor: '#1f9950',
          backgroundColor: grad,
          tension: 0.45,
          fill: true,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#1f9950',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => ` ${c.parsed.y} مهمة` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 10 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: { stepSize: 1, font: { family: 'Cairo', size: 10 } }
          }
        }
      }
    });
  }

  destroyCharts() {
    this.tasksChart?.destroy();
    this.financeChart?.destroy();
    this.activityChartInstance?.destroy();
  }

  // ─── AI Insights ─────────────────────────────────────────────

  /**
   * يُولِّد توصيات ذكية بناءً على:
   *   tasksProgress, pendingTasks  ← TaskService
   *   profit, profitMargin         ← FinanceService
   *   totalProjects, progressSteps ← ProjectService
   */
  generateAIInsights() {
    this.aiInsights = [];

    if (this.totalTasks > 0 && this.tasksProgress < 50) {
      this.aiInsights.push({
        type: 'warning',
        message: `لديك ${this.pendingTasks} مهمة معلقة. ننصح بتحديد الأولويات لإنجاز المشروع بكفاءة.`,
        action: 'tasks', actionLabel: 'عرض المهام'
      });
    } else if (this.tasksProgress > 80) {
      this.aiInsights.push({
        type: 'success',
        message: 'عمل رائع! أنت على وشك إكمال جميع مهامك. استمر في التقدم!'
      });
    }

    if (this.profit < 0) {
      this.aiInsights.push({
        type: 'warning',
        message: 'نلاحظ أن مصروفاتك تتجاوز إيراداتك. راجع ميزانيتك لتحسين الأرباح.',
        action: 'finance', actionLabel: 'مراجعة المالية'
      });
    } else if (this.profitMargin > 30) {
      this.aiInsights.push({
        type: 'success',
        message: `هامش الربح لديك ممتاز (${this.profitMargin}%)! استمر في هذا الأداء الرائع.`
      });
    }

    if (this.totalProjects === 0) {
      this.aiInsights.push({
        type: 'info',
        message: 'ابدأ رحلتك بإنشاء مشروعك الأول. سنساعدك في كل خطوة!',
        action: 'create-project', actionLabel: 'إنشاء مشروع'
      });
    }

    if (this.totalProjects > 0 && !this.progressSteps[2].done) {
      this.aiInsights.push({
        type: 'info',
        message: 'هل تحتاج مساعدة؟ قم بدعوة أعضاء فريقك للتعاون معك في المشروع.',
        action: 'team', actionLabel: 'إضافة فريق'
      });
    }

    if (this.totalProjects > 0 && !this.progressSteps[1].done) {
      this.aiInsights.push({
        type: 'info',
        message: 'خطة التسويق هي مفتاح نجاح مشروعك. ابدأ الآن بخطة مخصصة.',
        action: 'marketing', actionLabel: 'إنشاء خطة'
      });
    }
  }

  // ─── Recent Activities ────────────────────────────────────────

  /**
   * يُولِّد سجل النشاط الأخير بناءً على:
   *   projects[] ← ProjectService
   *   completedTasks ← TaskService
   *   totalRevenue   ← FinanceService
   */
  generateRecentActivities() {
    this.recentActivities = [];

    if (this.totalProjects > 0 && this.projects[0]?.createdAt) {
      this.recentActivities.push({
        type: 'project',
        message: `تم إنشاء مشروع "${this.projects[0].name}"`,
        timestamp: new Date(this.projects[0].createdAt!)
      });
    }

    if (this.completedTasks > 0) {
      this.recentActivities.push({
        type: 'task',
        message: `تم إكمال ${this.completedTasks} مهمة بنجاح`,
        timestamp: new Date()
      });
    }

    if (this.totalRevenue > 0) {
      this.recentActivities.push({
        type: 'finance',
        message: `تم تسجيل إيرادات بقيمة ${this.formatCurrency(this.totalRevenue)}`,
        timestamp: new Date()
      });
    }

    this.recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ─── UI Actions ───────────────────────────────────────────────

  openGuide()  { this.showGuide = true;  }
  closeGuide() { this.showGuide = false; }

  createNewProject() {
    this.router.navigate(['/projects/new']);
  }

  /**
   * Endpoint: PATCH /tasks/:id  →  TaskService.updateTask(id, { status: 'done' })
   * يُحدِّث المهمة محلياً فوراً ثم يرسل للـ API
   */
  completeTask(taskId: number) {
    const taskIndex = this.upcomingTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    this.upcomingTasks.splice(taskIndex, 1);
    this.completedTasks++;
    this.totalTasks = this.upcomingTasks.length + this.completedTasks;
    if (this.totalTasks > 0) {
      this.tasksProgress = Math.round((this.completedTasks / this.totalTasks) * 100);
    }
    this.projectProgress = Math.min(this.projectProgress + 5, 100);

    this.recentActivities.unshift({
      type: 'task',
      message: 'تم إكمال مهمة بنجاح',
      timestamp: new Date()
    });

    // TODO: فعِّل هذا الكود عند ربط الـ API
    // if (!this.currentProject) return;
    // this.taskService.updateTask(taskId, { status: 'done' })
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({ next: () => this.loadProjectData(this.currentProject!.id!) });
  }

  handleInsightAction(action: string) {
    const routes: { [key: string]: string } = {
      tasks:     '/tasks-and-team',
      finance:   '/financial-overview',
      team:      '/tasks-and-team',
      marketing: '/marketing',
    };
    if (action === 'create-project') {
      this.createNewProject();
    } else if (routes[action]) {
      this.router.navigate([routes[action]]);
    }
  }

  // ─── Utility Functions ────────────────────────────────────────

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency', currency: 'SAR', minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    const diff = date.getTime() - new Date().getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0)  return 'اليوم';
    if (days === 1)  return 'غداً';
    if (days === -1) return 'أمس';
    if (days > 0 && days <= 7) return `خلال ${days} أيام`;
    return new Intl.DateTimeFormat('ar-SA', { month: 'short', day: 'numeric' }).format(date);
  }

  getPriorityLabel(priority: string): string {
    return ({ low: 'منخفضة', medium: 'متوسطة', high: 'عالية' }[priority] || priority);
  }

  getRelativeTime(timestamp: Date): string {
    const diff    = new Date().getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours   = Math.floor(diff / 3600000);
    const days    = Math.floor(diff / 86400000);
    if (minutes < 1)  return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours   < 24) return `منذ ${hours} ساعة`;
    if (days    === 1) return 'أمس';
    return `منذ ${days} يوم`;
  }
}