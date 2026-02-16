import { Component, OnInit } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProjectService, Project } from '../services/project';
import { TaskService } from '../services/task';
import { FinanceService } from '../services/finance';

interface Card {
  icon: string;
  title: string;
  description: string;
  progress: number;
  label: string;
  route: string;
}

interface Alert {
  type: 'warning' | 'info' | 'success';
  message: string;
  route: string;
  routeText: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [SideBar, CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  standalone: true
})
export class Dashboard implements OnInit {
  currentUser: any = null;
  userName: string = 'المستخدم';
  userPoints: number = 500;

  isLoading = false;
  projectsLoading = true;
  tasksLoading = true;
  financeLoading = true;

  showGuide = false;

  projects: Project[] = [];
  totalProjects = 0;
  activeProjects = 0;

  totalTasks = 0;
  completedTasks = 0;
  pendingTasks = 0;
  tasksProgress = 0;

  totalRevenue = 0;
  totalExpenses = 0;
  profit = 0;
  profitPercentage = 0;

  projectProgress = 0;
  progressSteps = [
    { text: 'تم إكمال الإعداد الأساسي', done: false },
    { text: 'إضافة أول خطة تسويقية', done: false },
    { text: 'إضافة أول فريق عمل', done: false }
  ];

  alerts: Alert[] = [];

  cards: Card[] = [
    {
      icon: '/graph-up-arrow.svg',
      title: 'أكمل خطتك التسويقية',
      description: 'أضف 3 منشورات لهذا الأسبوع',
      progress: 60,
      label: 'التقدم',
      route: '/marketing'
    },
    {
      icon: '/clipboard-data.svg',
      title: 'راجع تقريرك المالي',
      description: 'تحديث الإيرادات والمصروفات',
      progress: 80,
      label: 'التقدم',
      route: '/financial-overview'
    },
    {
      icon: '/stars.svg',
      title: 'تعلم مهارة جديدة',
      description: 'درس : كيف تكتب محتوى جذاب',
      progress: 0,
      label: 'التقدم',
      route: '/community'
    }
  ];

  upcomingTasks = [
    { title: 'اجتماع مع المورد', time: '3:00 م', date: 'اليوم' },
    { title: 'نشر محتوى على السوشيال ميديا', time: '5:00 م', date: 'اليوم' },
    { title: 'مراجعة الطلبات الجديدة', time: '', date: 'غدًا' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private projectService: ProjectService,
    private taskService: TaskService,
    private financeService: FinanceService
  ) {}

  ngOnInit() {
    this.loadAOSScript();
    this.loadUserData();
    this.loadDashboardData();
  }

  loadUserData() {
    this.currentUser = this.authService.currentUserValue;
    if (this.currentUser && this.currentUser.name) {
      this.userName = this.currentUser.name;
    }
  }

  loadDashboardData() {
    setTimeout(() => {
      this.loadProjects();
    }, 100);
  }

  loadProjects() {
    this.projectsLoading = true;
    
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          this.projects = response.data;
          this.totalProjects = this.projects.length;
          this.activeProjects = this.projects.filter((p: Project) => 
            p.stage === 'execution' || p.stage === 'planning'
          ).length;
          
          if (this.totalProjects > 0) {
            this.projectProgress = 50;
            this.progressSteps[0].done = true;
            this.progressSteps[1].done = true;
            
            this.loadTasks(this.projects[0].id!);
            this.loadFinanceSummary(this.projects[0].id!);
          } else {
            this.tasksLoading = false;
            this.financeLoading = false;
          }
        }
        
        this.projectsLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading projects:', error);
        this.projectsLoading = false;
        this.tasksLoading = false;
        this.financeLoading = false;
      }
    });
  }

  loadTasks(projectId: number) {
    this.tasksLoading = true;
    
    this.taskService.getTasks(projectId).subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          const tasks = response.data;
          this.totalTasks = tasks.length;
          this.completedTasks = tasks.filter((t: any) => t.status === 'done').length;
          this.pendingTasks = this.totalTasks - this.completedTasks;
          
          if (this.totalTasks > 0) {
            this.tasksProgress = Math.round((this.completedTasks / this.totalTasks) * 100);
          }
        }
        
        this.tasksLoading = false;
      },
      error: (error: any) => {
        this.tasksLoading = false;
      }
    });
  }

  loadFinanceSummary(projectId: number) {
    this.financeLoading = true;
    
    this.financeService.getSummary(projectId).subscribe({
      next: (response: any) => {
        if (response && response.success && response.data) {
          const data = response.data;
          this.totalRevenue = data.totalRevenue || 0;
          this.totalExpenses = data.totalExpenses || 0;
          this.profit = data.profit || 0;
          
          if (this.totalRevenue > 0) {
            this.profitPercentage = Math.round((this.profit / this.totalRevenue) * 100);
          }
        }
        
        this.financeLoading = false;
      },
      error: (error: any) => {
        this.financeLoading = false;
      }
    });
  }

  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }

  logout() {
    if (confirm('هل تريد تسجيل الخروج؟')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }

  createNewProject() {
    this.router.navigate(['/projects/new']);
  }

  private loadAOSScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof (window as any).AOS !== 'undefined') {
        (window as any).AOS.init({ duration: 800, once: true });
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js';
      script.onload = () => {
        if ((window as any).AOS) {
          (window as any).AOS.init({ duration: 800, once: true });
        }
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  getAlertClass(type: string): string {
    return type === 'warning' ? 'orange' : type === 'success' ? 'green' : 'blue';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}