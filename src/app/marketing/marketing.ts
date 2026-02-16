import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SideBar } from '../side-bar/side-bar';
import { MarketingService, MarketingPlan } from '../services/marketing';
import { ProjectService } from '../services/project';
import { Subject, takeUntil, timeout, catchError, of } from 'rxjs';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface MarketingStep {
  title: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
}

interface ContentIdea {
  id: string;
  title: string;
  description: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin';
  type: string;
  priority: 'high' | 'medium' | 'low';
}

interface ScheduledPost {
  id: string;
  title: string;
  scheduledTime: string;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin';
  status: 'scheduled' | 'draft';
}

@Component({
  selector: 'app-marketing',
  imports: [CommonModule, SideBar, RouterLink],
  templateUrl: './marketing.html',
  styleUrls: ['./marketing.css'],
  standalone: true
})
export class Marketing implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  // Chart References
  @ViewChild('contentChart') contentChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('channelsChart') channelsChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('engagementChart') engagementChart?: ElementRef<HTMLCanvasElement>;
  
  // Chart Instances
  private contentChartInstance?: Chart;
  private channelsChartInstance?: Chart;
  private engagementChartInstance?: Chart;

  // UI State
  showGuide = false;
  isLoading = false;
  isGeneratingAI = false;
  chartsLoading = true;

  // Marketing Data
  currentPlan: MarketingPlan | null = null;
  currentProjectId: number | null = null;

  // Metrics
  publishedContent = 0;
  scheduledContent = 0;
  totalEngagement = '0';
  activeCampaigns = 0;
  daysRemaining = 0;
  contentGrowth = 0;
  engagementProgress = 0;

  // Progress
  planProgress = 0;
  completedSteps = 0;
  totalSteps = 5;

  // Marketing Steps
  marketingSteps: MarketingStep[] = [
    {
      title: 'تحديد الجمهور المستهدف',
      description: 'حدد شرائح العملاء المثالية',
      status: 'pending'
    },
    {
      title: 'إنشاء هوية بصرية',
      description: 'شعار وألوان موحدة',
      status: 'pending'
    },
    {
      title: 'إطلاق حملة سوشيال ميديا',
      description: '10 منشورات خلال أسبوعين',
      status: 'pending'
    },
    {
      title: 'تفعيل الإعلانات المدفوعة',
      description: 'حملة إعلانية مستهدفة',
      status: 'pending'
    },
    {
      title: 'قياس النتائج والتطوير',
      description: 'تحليل البيانات والتحسين',
      status: 'pending'
    }
  ];

  // Content Ideas
  contentIdeas: ContentIdea[] = [];
  
  // Scheduled Posts
  scheduledPosts: ScheduledPost[] = [];
  
  // Chart Data
  monthlyContentData = {
    months: ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو'],
    posts: [12, 19, 15, 22, 18, 24],
    engagement: [3.2, 5.1, 4.3, 6.8, 5.5, 7.9]
  };
  
  channelsPerformance = {
    labels: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok'],
    data: [85, 72, 60, 78, 90]
  };
  
  dailyEngagement: number[] = [];

  constructor(
    private router: Router,
    private marketingService: MarketingService,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.loadMarketingData();
    this.generateDailyEngagement();
  }
  
  ngAfterViewInit() {
    // Charts will be created after data is loaded
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  loadMarketingData() {
    this.isLoading = false;

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
          if (response && response.success && response.data && response.data.length > 0) {
            this.currentProjectId = response.data[0].id;
            
            if (this.currentProjectId) {
              this.loadMarketingPlans(this.currentProjectId);
            } else {
              this.initializeMockData();
            }
          } else {
            this.initializeMockData();
          }
        },
        error: () => {
          this.initializeMockData();
        }
      });
  }

  loadMarketingPlans(projectId: number) {
    this.marketingService.getPlans(projectId)
      .pipe(
        timeout(5000),
        catchError(error => {
          console.error('Error loading marketing plans:', error);
          return of({ success: false, data: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data && response.data.length > 0) {
            this.currentPlan = response.data[0];
            
            if (this.currentPlan) {
              this.processMarketingPlan(this.currentPlan);
            } else {
              this.initializeMockData();
            }
          } else {
            this.initializeMockData();
          }
        },
        error: () => {
          this.initializeMockData();
        }
      });
  }

  processMarketingPlan(plan: MarketingPlan) {
    // Process real plan data
    this.publishedContent = 24;
    this.scheduledContent = 8;
    this.totalEngagement = '12.5K';
    this.activeCampaigns = 3;
    this.daysRemaining = 15;
    this.contentGrowth = 12;
    this.engagementProgress = 75;

    this.completedSteps = 2;
    this.planProgress = Math.round((this.completedSteps / this.totalSteps) * 100);

    this.updateStepsStatus();
    
    // Load charts after data
    this.chartsLoading = false;
    setTimeout(() => {
      this.createAllCharts();
    }, 100);
  }

  initializeMockData() {
    this.publishedContent = 24;
    this.scheduledContent = 8;
    this.totalEngagement = '12.5K';
    this.activeCampaigns = 3;
    this.daysRemaining = 15;
    this.contentGrowth = 12;
    this.engagementProgress = 75;
    
    this.completedSteps = 1;
    this.planProgress = Math.round((this.completedSteps / this.totalSteps) * 100);
    
    this.updateStepsStatus();
    this.loadMockContentIdeas();
    
    // Load charts
    this.chartsLoading = false;
    setTimeout(() => {
      this.createAllCharts();
    }, 100);
  }
  
  updateStepsStatus() {
    if (this.completedSteps >= 1) {
      this.marketingSteps[0].status = 'completed';
    }
    if (this.completedSteps >= 2) {
      this.marketingSteps[1].status = 'completed';
    }
    if (this.completedSteps >= 3) {
      this.marketingSteps[2].status = 'completed';
    }
    if (this.completedSteps >= 4) {
      this.marketingSteps[3].status = 'completed';
    }
    if (this.completedSteps >= 5) {
      this.marketingSteps[4].status = 'completed';
    }
    
    if (this.completedSteps < this.totalSteps) {
      this.marketingSteps[this.completedSteps].status = 'active';
    }
  }
  
  loadMockContentIdeas() {
    this.contentIdeas = [
      {
        id: '1',
        title: 'نصيحة يومية لرواد الأعمال',
        description: 'محتوى ملهم يساعد على النجاح',
        platform: 'instagram',
        type: 'carousel',
        priority: 'high'
      },
      {
        id: '2',
        title: 'قصة نجاح عميل',
        description: 'مشاركة تجربة إيجابية',
        platform: 'facebook',
        type: 'video',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'إنفوجرافيك عن السوق',
        description: 'بيانات مفيدة بشكل بصري',
        platform: 'linkedin',
        type: 'image',
        priority: 'high'
      }
    ];
  }
  
  generateDailyEngagement() {
    // Generate 30 days of engagement data
    this.dailyEngagement = Array.from({length: 30}, () => 
      Math.floor(Math.random() * 500 + 200)
    );
  }

  // ==================== CHARTS ====================
  
  createAllCharts() {
    this.createContentPerformanceChart();
    this.createChannelsComparisonChart();
    this.createEngagementTimelineChart();
  }
  
  createContentPerformanceChart() {
    if (!this.contentChart) return;
    
    const ctx = this.contentChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.contentChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthlyContentData.months,
        datasets: [
          {
            type: 'bar',
            label: 'المنشورات',
            data: this.monthlyContentData.posts,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'التفاعل (K)',
            data: this.monthlyContentData.engagement,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: 'Cairo', size: 12 },
              usePointStyle: true,
              padding: 15
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'عدد المنشورات',
              font: { family: 'Cairo' }
            },
            ticks: {
              font: { family: 'Cairo' }
            }
          },
          y1: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'التفاعل (بالآلاف)',
              font: { family: 'Cairo' }
            },
            ticks: {
              font: { family: 'Cairo' }
            },
            grid: {
              drawOnChartArea: false
            }
          },
          x: {
            ticks: {
              font: { family: 'Cairo' }
            }
          }
        }
      }
    });
  }
  
  createChannelsComparisonChart() {
    if (!this.channelsChart) return;
    
    const ctx = this.channelsChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.channelsChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.channelsPerformance.labels,
        datasets: [{
          label: 'الأداء',
          data: this.channelsPerformance.data,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(59, 130, 246)',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20,
              font: { family: 'Cairo' }
            },
            pointLabels: {
              font: { family: 'Cairo', size: 12 }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }
  
  createEngagementTimelineChart() {
    if (!this.engagementChart) return;
    
    const ctx = this.engagementChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const days = Array.from({length: 30}, (_, i) => `${i+1}`);
    
    this.engagementChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [{
          label: 'التفاعل اليومي',
          data: this.dailyEngagement,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
            return gradient;
          },
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: 'rgb(16, 185, 129)',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y || 0;
                return `${value.toLocaleString()} تفاعل`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: { family: 'Cairo' },
              callback: (value) => {
                return value.toLocaleString();
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            ticks: {
              font: { family: 'Cairo', size: 10 },
              maxRotation: 0
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
    if (this.contentChartInstance) {
      this.contentChartInstance.destroy();
    }
    if (this.channelsChartInstance) {
      this.channelsChartInstance.destroy();
    }
    if (this.engagementChartInstance) {
      this.engagementChartInstance.destroy();
    }
  }

  // ==================== UI ACTIONS ====================

  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }

  generateAIPlan() {
    this.isGeneratingAI = true;
    
    // Simulate AI generation
    setTimeout(() => {
      this.isGeneratingAI = false;
      alert('سيتم إضافة هذه الميزة قريباً عند اكتمال تطوير الذكاء الاصطناعي');
    }, 2000);
  }

  createContent(idea?: ContentIdea) {
    if (idea) {
      console.log('Creating content:', idea);
      alert(`سيتم إنشاء محتوى: ${idea.title}`);
    } else {
      console.log('Creating new content');
      alert('سيتم فتح نافذة إنشاء محتوى جديد');
    }
  }

  useIdea(idea: ContentIdea) {
    console.log('Using idea:', idea);
    alert(`سيتم استخدام الفكرة: ${idea.title}`);
  }

  generateAIContent() {
    this.isGeneratingAI = true;
    
    // Simulate AI generation
    setTimeout(() => {
      this.isGeneratingAI = false;
      alert('تم توليد أفكار محتوى جديدة بواسطة الذكاء الاصطناعي');
      
      // Add some AI-generated ideas
      this.contentIdeas.unshift({
        id: String(this.contentIdeas.length + 1),
        title: 'محتوى مقترح من AI',
        description: 'فكرة محتوى تم توليدها بالذكاء الاصطناعي',
        platform: 'instagram',
        type: 'post',
        priority: 'high'
      });
    }, 2000);
  }

  editPlan() {
    if (this.currentPlan) {
      this.router.navigate(['/marketing/edit', this.currentPlan.id]);
    }
  }

  viewAnalytics() {
    this.router.navigate(['/analytics']);
  }

  viewCampaigns() {
    console.log('Viewing campaigns');
    alert('سيتم إضافة صفحة الحملات قريباً');
  }

  viewSchedule() {
    console.log('Viewing schedule');
    alert('سيتم إضافة صفحة جدولة المنشورات قريباً');
  }

  // ==================== UTILITY FUNCTIONS ====================

  getPlatformIcon(platform: string): string {
    const icons: { [key: string]: string } = {
      instagram: '📷',
      facebook: '👍',
      twitter: '🐦',
      linkedin: '💼',
      tiktok: '🎵'
    };
    return icons[platform] || '📱';
  }

  getPlatformLabel(platform: string): string {
    const labels: { [key: string]: string } = {
      instagram: 'إنستجرام',
      facebook: 'فيسبوك',
      twitter: 'تويتر',
      linkedin: 'لينكد إن',
      tiktok: 'تيك توك'
    };
    return labels[platform] || platform;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      scheduled: 'مجدول',
      draft: 'مسودة',
      published: 'منشور',
      pending: 'قيد الانتظار'
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      high: 'عالية',
      medium: 'متوسطة',
      low: 'منخفضة'
    };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      completed: '✅',
      active: '🔄',
      pending: '⏳'
    };
    return icons[status] || '❓';
  }
}