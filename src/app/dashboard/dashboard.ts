import { Component, OnInit, OnDestroy } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProjectService, Project } from '../services/project';
import { TaskService } from '../services/task';
import { FinanceService } from '../services/finance';
import { Subject, takeUntil, forkJoin, timeout, catchError, of } from 'rxjs';

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
  imports: [SideBar, CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  standalone: true
})
export class Dashboard implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // User Info
  currentUser: any = null;
  userName: string = 'المستخدم';
  userPoints: number = 100; // Default value
  userLevel: number = 1;

  // Loading States
  isInitialLoading = false; // Changed to false for instant display
  projectsLoading = true;
  tasksLoading = true;
  financeLoading = true;

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData() {
    this.currentUser = this.authService.currentUserValue;
    if (this.currentUser) {
      this.userName = this.currentUser.name || 'المستخدم';
      
      // Calculate user level based on projects and tasks
      this.calculateUserLevel();
    }
  }

  calculateUserLevel() {
    // Simple level calculation: 1 level per 100 points
    // Points: 10 per project, 5 per completed task, 1 per activity
    const projectPoints = this.totalProjects * 10;
    const taskPoints = this.completedTasks * 5;
    this.userPoints = projectPoints + taskPoints + this.recentActivities.length;
    this.userLevel = Math.floor(this.userPoints / 100) + 1;
  }

  loadDashboardData() {
    // Remove blocking overlay - show skeleton loaders instead
    this.isInitialLoading = false;

    // Load projects first with timeout
    this.projectService.getProjects()
      .pipe(
        timeout(5000), // 5 second timeout
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

            // Update progress based on projects
            if (this.totalProjects > 0) {
              this.progressSteps[0].done = true;
              this.projectProgress = 33;
              this.currentProject = this.projects[0];

              // Load tasks and finance for first project (in parallel, non-blocking)
              this.loadProjectData(this.currentProject.id!);
            } else {
              this.tasksLoading = false;
              this.financeLoading = false;
            }
          } else {
            this.tasksLoading = false;
            this.financeLoading = false;
          }
        },
        error: (error: any) => {
          console.error('Error loading projects:', error);
          this.projectsLoading = false;
          this.tasksLoading = false;
          this.financeLoading = false;
        }
      });
  }

  loadProjectData(projectId: number) {
    // Load tasks and finance data in parallel (non-blocking) with timeout
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
        // Process tasks
        if (results.tasks && results.tasks.success && results.tasks.data) {
          this.processTasks(results.tasks.data);
        }
        this.tasksLoading = false;

        // Process finance
        if (results.finance && results.finance.success && results.finance.data) {
          this.processFinance(results.finance.data);
        }
        this.financeLoading = false;

        // Generate AI insights after data is loaded
        this.generateAIInsights();
        
        // Generate recent activities
        this.generateRecentActivities();
        
        // Recalculate user level
        this.calculateUserLevel();
      },
      error: (error) => {
        console.error('Error loading project data:', error);
        this.tasksLoading = false;
        this.financeLoading = false;
      }
    });
  }

  processTasks(tasks: any[]) {
    this.totalTasks = tasks.length;
    this.completedTasks = tasks.filter((t: any) => t.status === 'done').length;
    this.pendingTasks = this.totalTasks - this.completedTasks;

    if (this.totalTasks > 0) {
      this.tasksProgress = Math.round((this.completedTasks / this.totalTasks) * 100);
      
      // Check if marketing plan step is done (assuming marketing tasks exist)
      const hasMarketingTasks = tasks.some((t: any) => 
        t.title?.toLowerCase().includes('تسويق') || 
        t.description?.toLowerCase().includes('تسويق')
      );
      if (hasMarketingTasks) {
        this.progressSteps[1].done = true;
        this.projectProgress = Math.max(this.projectProgress, 66);
      }
    }

    // Get upcoming tasks (not completed, sorted by due date)
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
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined
      }));
  }

  processFinance(data: any) {
    this.totalRevenue = data.totalRevenue || 0;
    this.totalExpenses = data.totalExpenses || 0;
    this.profit = this.totalRevenue - this.totalExpenses;

    if (this.totalRevenue > 0) {
      this.profitMargin = Math.round((this.profit / this.totalRevenue) * 100);
    }

    // Calculate change percentages (mock data - you can enhance this with historical data)
    this.revenueChange = this.totalRevenue > 0 ? Math.round(Math.random() * 15) : 0;
    this.expensesChange = this.totalExpenses > 0 ? Math.round(Math.random() * 10) : 0;
  }

  generateAIInsights() {
    this.aiInsights = [];

    // Insight based on tasks progress
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

    // Insight based on finance
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

    // Insight based on project stage
    if (this.totalProjects === 0) {
      this.aiInsights.push({
        type: 'info',
        message: 'ابدأ رحلتك بإنشاء مشروعك الأول. سنساعدك في كل خطوة!',
        action: 'create-project',
        actionLabel: 'إنشاء مشروع'
      });
    }

    // Insight based on team (mock - enhance with real team data)
    if (this.totalProjects > 0 && !this.progressSteps[2].done) {
      this.aiInsights.push({
        type: 'info',
        message: 'هل تحتاج مساعدة؟ قم بدعوة أعضاء فريقك للتعاون معك في المشروع.',
        action: 'team',
        actionLabel: 'إضافة فريق'
      });
    }

    // Marketing insight
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

    // Sort by timestamp descending
    this.recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // UI Actions
  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }

  createNewProject() {
    // Navigate to project creation - adjust route as needed
    this.router.navigate(['/projects/new']);
  }

  completeTask(taskId: number) {
    if (!this.currentProject) return;

    this.taskService.updateTask(taskId, { status: 'done' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Reload tasks
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

  // Utility Functions
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