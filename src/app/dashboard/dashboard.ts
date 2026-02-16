import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
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
  chartsLoading = true;

  // UI State
  showGuide = false;

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
    private financeService: FinanceService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadDashboardData();
  }
  
  ngAfterViewInit() {
    // Charts will be created after data is loaded
  }

  ngOnDestroy() {
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
          data: [
            this.completedTasks,
            this.inProgressTasks,
            this.pendingTasks
          ],
          backgroundColor: [
            '#10b981', // Green
            '#3b82f6', // Blue
            '#ef4444'  // Red
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                return `${label}: ${value} مهمة (${percentage}%)`;
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
        labels: ['الإيرادات', 'المصروفات', 'الربح'],
        datasets: [{
          label: 'المبلغ (ر.س)',
          data: [
            this.totalRevenue,
            this.totalExpenses,
            this.profit
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(59, 130, 246, 0.7)'
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(239, 68, 68)',
            'rgb(59, 130, 246)'
          ],
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y || 0;
                return `${value.toLocaleString('ar-SA')} ر.س`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return `${value.toLocaleString('ar-SA')} ر.س`;
              },
              font: { family: 'Cairo' }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: { family: 'Cairo', size: 12 }
            },
            grid: {
              display: false
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
    
    const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    
    this.activityChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weekDays,
        datasets: [{
          label: 'المهام المكتملة',
          data: this.weeklyActivity,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.parsed.y} مهمة`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { family: 'Cairo' }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: { family: 'Cairo', size: 11 }
            },
            grid: {
              display: false
            }
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