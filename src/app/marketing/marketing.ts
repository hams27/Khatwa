import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SideBar } from '../side-bar/side-bar';
import { MarketingService, MarketingPlan } from '../services/marketing';
import { ProjectService } from '../services/project';
import { Subject, takeUntil, timeout, catchError, of } from 'rxjs';

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
export class Marketing implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // UI State
  showGuide = false;
  isLoading = false;
  isGeneratingAI = false;

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

  // Marketing Steps (like Dashboard progress steps)
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
  contentIdeas: ContentIdea[] = [
    {
      id: '1',
      title: 'نصيحة يومية لرواد الأعمال',
      description: 'محتوى ملهم يساعد على النجاح',
      platform: 'instagram',
      type: 'post',
      priority: 'high'
    },
    {
      id: '2',
      title: 'قصة نجاح عميل',
      description: 'بناء الثقة مع جمهورك',
      platform: 'facebook',
      type: 'story',
      priority: 'medium'
    },
    {
      id: '3',
      title: 'فيديو توضيحي',
      description: 'اشرح منتجك بطريقة جذابة',
      platform: 'twitter',
      type: 'video',
      priority: 'high'
    }
  ];

  // Scheduled Posts (like Dashboard upcoming tasks)
  scheduledPosts: ScheduledPost[] = [
    {
      id: '1',
      title: 'نصائح لزيادة الإنتاجية',
      scheduledTime: 'اليوم، 6:00 م',
      platform: 'instagram',
      status: 'scheduled'
    },
    {
      id: '2',
      title: 'عرض نهاية الأسبوع',
      scheduledTime: 'غداً، 10:00 ص',
      platform: 'facebook',
      status: 'scheduled'
    },
    {
      id: '3',
      title: 'مقابلة مع خبير',
      scheduledTime: 'الجمعة، 3:00 م',
      platform: 'twitter',
      status: 'draft'
    }
  ];

  constructor(
    private router: Router,
    private marketingService: MarketingService,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.loadMarketingData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMarketingData() {
    this.isLoading = false; // Fast loading like dashboard

    // Get current project
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
    // Process plan data
    this.publishedContent = 24;
    this.scheduledContent = 8;
    this.totalEngagement = '12.5K';
    this.activeCampaigns = 3;
    this.daysRemaining = 15;
    this.contentGrowth = 12;
    this.engagementProgress = 75;

    // Update progress
    this.completedSteps = 2;
    this.planProgress = Math.round((this.completedSteps / this.totalSteps) * 100);

    // Update steps
    this.updateStepsStatus();
  }

  initializeMockData() {
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
  }

  updateStepsStatus() {
    // Update based on completed steps
    for (let i = 0; i < this.marketingSteps.length; i++) {
      if (i < this.completedSteps) {
        this.marketingSteps[i].status = 'completed';
      } else if (i === this.completedSteps) {
        this.marketingSteps[i].status = 'active';
      } else {
        this.marketingSteps[i].status = 'pending';
      }
    }
  }

  // UI Actions
  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }

  createContent() {
    console.log('Create content');
    // TODO: Navigate to content creation
  }

  generateAIContent() {
    this.isGeneratingAI = true;

    // Simulate AI generation (like Dashboard)
    setTimeout(() => {
      const newIdeas: ContentIdea[] = [
        {
          id: Date.now().toString(),
          title: 'Behind the Scenes',
          description: 'اعرض الجانب الإنساني لعلامتك',
          platform: 'instagram',
          type: 'reel',
          priority: 'high'
        },
        {
          id: (Date.now() + 1).toString(),
          title: 'نصائح سريعة',
          description: 'نصائح مفيدة في دقيقة واحدة',
          platform: 'twitter',
          type: 'tips',
          priority: 'medium'
        }
      ];

      this.contentIdeas = [...newIdeas, ...this.contentIdeas].slice(0, 5);
      this.isGeneratingAI = false;
    }, 2000);
  }

  useIdea(idea: ContentIdea) {
    console.log('Using idea:', idea);
    // TODO: Navigate to content creation with idea
  }

  viewAnalytics() {
    this.router.navigate(['/analytics']);
  }

  viewSchedule() {
    console.log('View schedule');
    // TODO: Navigate to schedule page
  }

  viewCampaigns() {
    console.log('View campaigns');
    // TODO: Navigate to campaigns
  }

  // Utility Functions
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      scheduled: 'مجدول',
      draft: 'مسودة'
    };
    return labels[status] || status;
  }

  getPlatformLabel(platform: string): string {
    const labels: { [key: string]: string } = {
      instagram: 'Instagram',
      facebook: 'Facebook',
      twitter: 'Twitter',
      linkedin: 'LinkedIn'
    };
    return labels[platform] || platform;
  }

  getPlatformIcon(platform: string): string {
    const icons: { [key: string]: string } = {
      instagram: '📸',
      facebook: '👥',
      twitter: '🐦',
      linkedin: '💼'
    };
    return icons[platform] || '📱';
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      high: 'أولوية عالية',
      medium: 'أولوية متوسطة',
      low: 'أولوية منخفضة'
    };
    return labels[priority] || priority;
  }
}