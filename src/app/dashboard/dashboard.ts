import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { ProjectService, Project } from '../services/project';
import { TaskService } from '../services/task';
import { FinanceService } from '../services/finance';
import { Subject, takeUntil, forkJoin, timeout, catchError, of } from 'rxjs';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

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

@Component({
  selector: 'app-dashboard',
  imports: [SideBar, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  standalone: true
})
export class Dashboard implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;
  
  // Sidebar Reference
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  // Chart References
  @ViewChild('tasksProgressChart') tasksProgressChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('miniFinanceChart') miniFinanceChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChart') activityChart?: ElementRef<HTMLCanvasElement>;
  
  // Chart Instances
  private tasksChart?: Chart;
  private financeChart?: Chart;
  private activityChartInstance?: Chart;
  
  // User Info
  currentUser: any = null;
  userName: string = 'المستخدم';
  userPoints: number = 100;
  userLevel: number = 1;

  // Loading States
  isInitialLoading = false;
  projectsLoading = true;
  tasksLoading = true;
  financeLoading = true;
  chartsLoading = false;

  // UI State
  showGuide = false;
  isSidebarCollapsed = false;

  onSidebarToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  openSidebar() {
    this.sidebarComponent?.openMobile();
  }

  // Projects
  projects: Project[] = [];
  totalProjects = 0;
  activeProjects = 0;
  currentProject: Project | null = null;

  // Tasks
  totalTasks = 0;
  completedTasks = 0;
  pendingTasks = 0;
  inProgressTasks = 0;
  tasksProgress = 0;
  upcomingTasks: Task[] = [];

  // Finance
  totalRevenue = 0;
  totalExpenses = 0;
  profit = 0;
  profitMargin = 0;
  revenueChange = 0;
  expensesChange = 0;

  // Progress
  projectProgress = 0;
  progressSteps: ProgressStep[] = [
    { 
      title: 'إنشاء المشروع', 
      description: 'قم بإنشاء مشروعك الأول',
      done: false 
    },
    { 
      title: 'إضافة خطة تسويقية', 
      description: 'ابدأ بخطة تسويقية مخصصة',
      done: false 
    },
    { 
      title: 'إضافة فريق العمل', 
      description: 'دعوة أعضاء الفريق للتعاون',
      done: false 
    }
  ];

  // AI Insights
  aiInsights: AIInsight[] = [];

  // Activities
  recentActivities: Activity[] = [];
  
  // Weekly Activity Data (for chart)
  weeklyActivity: number[] = [0, 0, 0, 0, 0, 0, 0];

  constructor(
    private router: Router,
    private authService: AuthService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private financeService: FinanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadMockData(); // ← داتا وهمية للعرض
    // this.loadDashboardData(); // ← فعّل هذا عند الاتصال بالـ API الحقيقي
  }

  // ==================== MOCK DATA ====================
  loadMockData() {
    // إيقاف حالات التحميل فوراً
    this.isInitialLoading = false;
    this.projectsLoading = false;
    this.tasksLoading = false;
    this.financeLoading = false;

    // ── بيانات المستخدم ──
    this.userName = 'محمد أحمد';
    this.userPoints = 350;
    this.userLevel = 4;

    // ── بيانات المشروع ──
    this.totalProjects = 1;
    this.activeProjects = 1;
    this.projectProgress = 66;
    this.progressSteps = [
      { title: 'إنشاء المشروع', description: 'قم بإنشاء مشروعك الأول', done: true },
      { title: 'إضافة خطة تسويقية', description: 'ابدأ بخطة تسويقية مخصصة', done: true },
      { title: 'إضافة فريق العمل', description: 'دعوة أعضاء الفريق للتعاون', done: false }
    ];

    // ── بيانات المهام ──
    this.totalTasks = 13;
    this.completedTasks = 8;
    this.inProgressTasks = 3;
    this.pendingTasks = 2;
    this.tasksProgress = 62;

    this.upcomingTasks = [
      {
        id: 1,
        title: 'إعداد العرض التقديمي للمستثمرين',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // غداً
      },
      {
        id: 2,
        title: 'مراجعة الميزانية الشهرية',
        status: 'in_progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 3,
        title: 'نشر محتوى سوشيال ميديا',
        status: 'todo',
        priority: 'low',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 4,
        title: 'اجتماع الفريق الأسبوعي',
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
      },
      {
        id: 5,
        title: 'تحديث خطة التسويق',
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      }
    ];

    // ── البيانات المالية ──
    this.totalRevenue = 45000;
    this.totalExpenses = 17550;
    this.profit = 27450;
    this.profitMargin = 61;
    this.revenueChange = 12;
    this.expensesChange = 5;

    // ── نشاط الأسبوع (آخر 7 أيام) ──
    this.weeklyActivity = [2, 5, 3, 7, 4, 8, 6];

    // ── النشاط الأخير ──
    this.recentActivities = [
      {
        type: 'task',
        message: 'تم إكمال مهمة "تصميم الشعار والهوية البصرية"',
        timestamp: new Date(Date.now() - 20 * 60 * 1000)
      },
      {
        type: 'team',
        message: 'انضم سعد الأحمدي إلى فريق المشروع',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        type: 'task',
        message: 'مهمة "العرض التقديمي" مستحقة غداً',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        type: 'finance',
        message: 'تم تسجيل إيراد جديد بقيمة 5,000 ر.س',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        type: 'project',
        message: 'تم تحديث الخطة التسويقية للمشروع',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    // ── توصيات الذكاء الاصطناعي ──
    this.aiInsights = [
      {
        type: 'success',
        message: 'هامش ربحك 61% ممتاز! أداؤك المالي أعلى من متوسط السوق بنسبة 18%.'
      },
      {
        type: 'warning',
        message: '38% من مهامك لم تكتمل بعد — حاول إنجاز مهمتين يومياً للبقاء في الموعد.',
        action: 'tasks',
        actionLabel: 'عرض المهام'
      },
      {
        type: 'info',
        message: 'الأسبوع القادم مناسب لإطلاق حملة تسويقية — جمهورك المستهدف أكثر نشاطاً.',
        action: 'marketing',
        actionLabel: 'ابدأ الآن'
      }
    ];

    // الشارتس هتتعمل تلقائياً في ngAfterViewInit
    this.chartsLoading = false;
  }
  
  ngAfterViewInit() {
    // الـ canvas دايماً موجود في الـ DOM (بنستخدم [hidden] مش *ngIf)
    setTimeout(() => this.createAllCharts(), 100);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  loadUserData() {
    this.currentUser = this.authService.currentUserValue;
    if (this.currentUser) {
      this.userName = this.currentUser.name || 'المستخدم';
      this.calculateUserLevel();
    }
  }

  calculateUserLevel() {
    const projectPoints = this.totalProjects * 10;
    const taskPoints = this.completedTasks * 5;
    this.userPoints = projectPoints + taskPoints + this.recentActivities.length;
    this.userLevel = Math.floor(this.userPoints / 100) + 1;
  }

  loadDashboardData() {
    this.isInitialLoading = false;

    this.projectService.getProjects()
      .pipe(
        timeout(5000),
        catchError(error => {
          console.error('Error or timeout loading projects:', error);
          return of({ success: false, data: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: any) => {
          this.projectsLoading = false;
          
          if (response && response.success && response.data) {
            this.projects = response.data;
            this.totalProjects = this.projects.length;
            this.activeProjects = this.projects.filter((p: Project) => 
              p.stage === 'execution' || p.stage === 'planning'
            ).length;

            if (this.totalProjects > 0) {
              this.progressSteps[0].done = true;
              this.projectProgress = 33;
              this.currentProject = this.projects[0];
              this.loadProjectData(this.currentProject.id!);
            } else {
              this.tasksLoading = false;
              this.financeLoading = false;
              this.chartsLoading = false;
            }
          } else {
            this.tasksLoading = false;
            this.financeLoading = false;
            this.chartsLoading = false;
          }
        },
        error: (error: any) => {
          console.error('Error loading projects:', error);
          this.projectsLoading = false;
          this.tasksLoading = false;
          this.financeLoading = false;
          this.chartsLoading = false;
        }
      });
  }

  loadProjectData(projectId: number) {
    forkJoin({
      tasks: this.taskService.getTasks(projectId).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Tasks timeout or error:', error);
          return of({ success: false, data: [] });
        })
      ),
      finance: this.financeService.getSummary(projectId).pipe(
        timeout(5000),
        catchError(error => {
          console.error('Finance timeout or error:', error);
          return of({ success: false, data: null });
        })
      )
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (results) => {
        if (results.tasks && results.tasks.success && results.tasks.data) {
          this.processTasks(results.tasks.data);
        }
        this.tasksLoading = false;

        if (results.finance && results.finance.success && results.finance.data) {
          this.processFinance(results.finance.data);
        }
        this.financeLoading = false;

        this.generateAIInsights();
        this.generateRecentActivities();
        this.calculateUserLevel();
        
        // Create charts after data is loaded
        this.chartsLoading = false;
        setTimeout(() => {
          this.createAllCharts();
        }, 100);
      },
      error: (error) => {
        console.error('Error loading project data:', error);
        this.tasksLoading = false;
        this.financeLoading = false;
        this.chartsLoading = false;
      }
    });
  }

  processTasks(tasks: any[]) {
    this.totalTasks = tasks.length;
    this.completedTasks = tasks.filter((t: any) => t.status === 'done').length;
    this.inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;
    this.pendingTasks = tasks.filter((t: any) => t.status === 'todo').length;

    if (this.totalTasks > 0) {
      this.tasksProgress = Math.round((this.completedTasks / this.totalTasks) * 100);
      
      const hasMarketingTasks = tasks.some((t: any) => 
        t.title?.toLowerCase().includes('تسويق') || 
        t.description?.toLowerCase().includes('تسويق')
      );
      if (hasMarketingTasks) {
        this.progressSteps[1].done = true;
        this.projectProgress = Math.max(this.projectProgress, 66);
      }
    }

    this.upcomingTasks = tasks
      .filter((t: any) => t.status !== 'done')
      .sort((a: any, b: any) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })
      .slice(0, 5)
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority || 'medium',
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        createdAt: t.createdAt
      }));
    
    // Calculate weekly activity
    this.calculateWeeklyActivity(tasks);
  }

  processFinance(data: any) {
    this.totalRevenue = data.totalRevenue || 0;
    this.totalExpenses = data.totalExpenses || 0;
    this.profit = this.totalRevenue - this.totalExpenses;

    if (this.totalRevenue > 0) {
      this.profitMargin = Math.round((this.profit / this.totalRevenue) * 100);
    }

    this.revenueChange = this.totalRevenue > 0 ? Math.round(Math.random() * 15) : 0;
    this.expensesChange = this.totalExpenses > 0 ? Math.round(Math.random() * 10) : 0;
  }
  
  calculateWeeklyActivity(tasks: Task[]) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6); // Last 7 days
    
    // Initialize array for 7 days
    this.weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
    
    // Count completed tasks per day
    tasks.filter(t => t.status === 'done' && t.createdAt).forEach(task => {
      const taskDate = new Date(task.createdAt!);
      if (taskDate >= weekStart && taskDate <= now) {
        const dayIndex = Math.floor((taskDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 7) {
          this.weeklyActivity[dayIndex]++;
        }
      }
    });
  }

  // ==================== CHARTS ====================
  
  createAllCharts() {
    this.createTasksProgressChart();
    this.createMiniFinanceChart();
    this.createActivityChart();
  }
  
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
            labels: {
              font: { family: 'Cairo', size: 12 },
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed || 0;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
                return ` ${context.label}: ${value} مهمة (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

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
              label: (context) => ` ${(context.parsed.y || 0).toLocaleString('ar-SA')} ر.س`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Cairo', size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.04)' },
            ticks: {
              font: { family: 'Cairo', size: 10 },
              callback: (v) => `${Number(v) / 1000}k`
            }
          }
        }
      }
    });
  }

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
          tooltip: {
            callbacks: { label: (c) => ` ${c.parsed.y} مهمة` }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Cairo', size: 10 } }
          },
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
    if (this.tasksChart) {
      this.tasksChart.destroy();
    }
    if (this.financeChart) {
      this.financeChart.destroy();
    }
    if (this.activityChartInstance) {
      this.activityChartInstance.destroy();
    }
  }

  // ==================== AI INSIGHTS ====================

  generateAIInsights() {
    this.aiInsights = [];

    if (this.totalTasks > 0 && this.tasksProgress < 50) {
      this.aiInsights.push({
        type: 'warning',
        message: `لديك ${this.pendingTasks} مهمة معلقة. ننصح بتحديد الأولويات لإنجاز المشروع بكفاءة.`,
        action: 'tasks',
        actionLabel: 'عرض المهام'
      });
    } else if (this.tasksProgress > 80) {
      this.aiInsights.push({
        type: 'success',
        message: 'عمل رائع! أنت على وشك إكمال جميع مهامك. استمر في التقدم!',
      });
    }

    if (this.profit < 0) {
      this.aiInsights.push({
        type: 'warning',
        message: 'نلاحظ أن مصروفاتك تتجاوز إيراداتك. راجع ميزانيتك لتحسين الأرباح.',
        action: 'finance',
        actionLabel: 'مراجعة المالية'
      });
    } else if (this.profitMargin > 30) {
      this.aiInsights.push({
        type: 'success',
        message: `هامش الربح لديك ممتاز (${this.profitMargin}%)! استمر في هذا الأداء الرائع.`,
      });
    }

    if (this.totalProjects === 0) {
      this.aiInsights.push({
        type: 'info',
        message: 'ابدأ رحلتك بإنشاء مشروعك الأول. سنساعدك في كل خطوة!',
        action: 'create-project',
        actionLabel: 'إنشاء مشروع'
      });
    }

    if (this.totalProjects > 0 && !this.progressSteps[2].done) {
      this.aiInsights.push({
        type: 'info',
        message: 'هل تحتاج مساعدة؟ قم بدعوة أعضاء فريقك للتعاون معك في المشروع.',
        action: 'team',
        actionLabel: 'إضافة فريق'
      });
    }

    if (this.totalProjects > 0 && !this.progressSteps[1].done) {
      this.aiInsights.push({
        type: 'info',
        message: 'خطة التسويق هي مفتاح نجاح مشروعك. ابدأ الآن بخطة مخصصة.',
        action: 'marketing',
        actionLabel: 'إنشاء خطة'
      });
    }
  }

  generateRecentActivities() {
    this.recentActivities = [];

    if (this.totalProjects > 0) {
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

  // ==================== UI ACTIONS ====================

  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }

  createNewProject() {
    this.router.navigate(['/projects/new']);
  }

  completeTask(taskId: number) {
    if (!this.currentProject) return;

    this.taskService.updateTask(taskId, { status: 'done' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadProjectData(this.currentProject!.id!);
        },
        error: (error) => {
          console.error('Error completing task:', error);
        }
      });
  }

  handleInsightAction(action: string) {
    switch (action) {
      case 'tasks':
        this.router.navigate(['/tasks-and-team']);
        break;
      case 'finance':
        this.router.navigate(['/financial-overview']);
        break;
      case 'create-project':
        this.createNewProject();
        break;
      case 'team':
        this.router.navigate(['/tasks-and-team']);
        break;
      case 'marketing':
        this.router.navigate(['/marketing']);
        break;
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'اليوم';
    } else if (days === 1) {
      return 'غداً';
    } else if (days === -1) {
      return 'أمس';
    } else if (days > 0 && days <= 7) {
      return `خلال ${days} أيام`;
    } else {
      return new Intl.DateTimeFormat('ar-SA', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      low: 'منخفضة',
      medium: 'متوسطة',
      high: 'عالية'
    };
    return labels[priority] || priority;
  }

  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'الآن';
    } else if (minutes < 60) {
      return `منذ ${minutes} دقيقة`;
    } else if (hours < 24) {
      return `منذ ${hours} ساعة`;
    } else if (days === 1) {
      return 'أمس';
    } else {
      return `منذ ${days} يوم`;
    }
  }
}