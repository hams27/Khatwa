import { CommonModule }          from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterLink }    from '@angular/router';
import { FormsModule }           from '@angular/forms';
import { Subject, takeUntil }    from 'rxjs';
import { Chart, registerables }  from 'chart.js';
import { SideBar }               from '../side-bar/side-bar';
import { AiChatComponent }       from '../ai-chat/ai-chat';
import { MarketingService, MarketingPlan } from '../services/marketing';
import { ProjectService }        from '../services/project';

Chart.register(...registerables);

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface MarketingStep {
  title:       string;
  description: string;
  status:      'completed' | 'active' | 'pending';
}

export interface ContentIdea {
  id:          string;
  title:       string;
  description: string;
  platform:    'instagram' | 'facebook' | 'twitter' | 'linkedin';
  type:        string;
  priority:    'high' | 'medium' | 'low';
}

export interface ScheduledPost {
  id:            string;
  title:         string;
  scheduledTime: string;
  platform:      'instagram' | 'facebook' | 'twitter' | 'linkedin';
  status:        'scheduled' | 'draft';
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

@Component({
  selector:    'app-marketing',
  standalone:  true,
  imports:     [CommonModule, SideBar, RouterLink, AiChatComponent, FormsModule],
  templateUrl: './marketing.html',
  styleUrls:   ['./marketing.css']
})
export class Marketing implements OnInit, AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();

  // ── References ──
  @ViewChild('sidebarRef')     sidebarComponent?: SideBar;
  @ViewChild('contentChart')   contentChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('channelsChart')  channelsChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('engagementChart')engagementChart?: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private contentChartInstance?:    Chart;
  private channelsChartInstance?:   Chart;
  private engagementChartInstance?: Chart;

  // ── حالة الـ UI ──
  isSidebarCollapsed = false;
  showGuide          = false;
  isGeneratingAI     = false;

  // ── حالة الموديلات ──
  showIdeaModal     = false;
  showScheduleModal = false;
  selectedIdea: ContentIdea | null = null;

  // ── حقول موديل الجدولة ──
  newPostTitle    = '';
  newPostPlatform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' = 'instagram';
  newPostTime     = '';

  // ── فلتر المنصة (قسم AI IDEAS) ──
  activePlatformFilter = 'all';

  // ─────────────────────────────────────────────
  // METRICS
  // يُعرض: WELCOME (totalEngagement) + METRICS (الكل)
  // المصدر: loadStats() ← API: GET /api/v1/marketing/stats
  // ─────────────────────────────────────────────
  publishedContent  = 0;
  scheduledContent  = 0;
  totalEngagement   = '0';
  contentGrowth     = 0;
  engagementProgress= 0;

  // ─────────────────────────────────────────────
  // PLAN PROGRESS
  // يُعرض: PLAN PROGRESS card (planProgress, marketingSteps)
  // المصدر: loadPlanProgress() ← API: GET /api/v1/marketing/plan-progress
  // ─────────────────────────────────────────────
  planProgress   = 0;
  completedSteps = 0;
  totalSteps     = 5;

  marketingSteps: MarketingStep[] = [
    { title: 'تحديد الجمهور المستهدف',    description: 'حدد شرائح العملاء المثالية',       status: 'pending' },
    { title: 'إنشاء هوية بصرية',           description: 'شعار وألوان موحدة',                status: 'pending' },
    { title: 'إطلاق حملة سوشيال ميديا',   description: '10 منشورات خلال أسبوعين',          status: 'pending' },
    { title: 'تفعيل الإعلانات المدفوعة',  description: 'حملة إعلانية مستهدفة',             status: 'pending' },
    { title: 'قياس النتائج والتطوير',      description: 'تحليل البيانات والتحسين',           status: 'pending' },
  ];

  // ─────────────────────────────────────────────
  // CHART DATA
  // يُعرض: charts-row (contentChart + channelsChart)
  // المصدر: loadChartData() ← API: GET /api/v1/marketing/chart-data
  // ─────────────────────────────────────────────
  monthlyContentData = {
    months:     [] as string[],
    posts:      [] as number[],
    engagement: [] as number[]
  };

  channelsPerformance = {
    labels: [] as string[],
    data:   [] as number[]
  };

  // ─────────────────────────────────────────────
  // ENGAGEMENT TIMELINE
  // يُعرض: engagement timeline chart + avgDailyEngagement + maxDailyEngagement
  // المصدر: loadEngagementData() ← API: GET /api/v1/marketing/engagement?days=30
  // ─────────────────────────────────────────────
  dailyEngagement:     number[] = [];
  avgDailyEngagement = '0';
  maxDailyEngagement = '0';

  // ─────────────────────────────────────────────
  // CONTENT IDEAS
  // يُعرض: AI CONTENT IDEAS card
  // المصدر: loadContentIdeas() ← API: GET /api/v1/marketing/content-ideas
  // filteredIdeas مشتقة من contentIdeas عبر filterPlatform()
  // ─────────────────────────────────────────────
  contentIdeas:  ContentIdea[] = [];
  filteredIdeas: ContentIdea[] = [];

  // ─────────────────────────────────────────────
  // SCHEDULED POSTS
  // يُعرض: CONTENT SCHEDULE card
  // المصدر: loadScheduledPosts() ← API: GET /api/v1/marketing/scheduled-posts
  // يتغير أيضاً عند: confirmUseIdea() و confirmSchedulePost()
  // ─────────────────────────────────────────────
  scheduledPosts: ScheduledPost[] = [];

  // بيانات المشروع الحالي (لتمرير project_id للـ API)
  private currentProjectId: number | null = null;

  constructor(
    private router:           Router,
    private marketingService: MarketingService,
    private projectService:   ProjectService
  ) {}

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  ngOnInit(): void {
    this.loadProjectThenData();
  }

  ngAfterViewInit(): void {
    // الشارتين تُبنى بعد تحميل البيانات — انظر createAllCharts()
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  // ─────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────

  onSidebarToggle(collapsed: boolean): void { this.isSidebarCollapsed = collapsed; }
  openSidebar(): void { this.sidebarComponent?.openMobile(); }

  // ─────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────

  /**
   * يحدد currentProjectId أولاً ثم يُطلق بقية التحميلات
   * ENDPOINT: GET /api/v1/projects  (للحصول على أول مشروع)
   */
  loadProjectThenData(): void {
    // TODO: this.projectService.getProjects().pipe(...).subscribe(res => {
    //   this.currentProjectId = res.data[0]?.id ?? null;
    //   this.loadStats();
    //   this.loadPlanProgress();
    //   this.loadChartData();
    //   this.loadEngagementData();
    //   this.loadContentIdeas();
    //   this.loadScheduledPosts();
    // });
  }

  /**
   * ENDPOINT: GET /api/v1/marketing/stats?project_id=:id
   * يُحدّث:
   *   - publishedContent, scheduledContent, totalEngagement (METRICS + WELCOME)
   *   - contentGrowth, engagementProgress (METRICS)
   */
  loadStats(): void {
    // TODO: this.marketingService.getStats(this.currentProjectId).subscribe(res => {
    //   this.publishedContent   = res.publishedContent;
    //   this.scheduledContent   = res.scheduledContent;
    //   this.totalEngagement    = res.totalEngagement;
    //   this.contentGrowth      = res.contentGrowth;
    //   this.engagementProgress = res.engagementProgress;
    // });
  }

  /**
   * ENDPOINT: GET /api/v1/marketing/plan-progress?project_id=:id
   * يُحدّث:
   *   - planProgress, completedSteps (PLAN PROGRESS card + الدائرة)
   *   - marketingSteps[].status عبر updateStepsStatus()
   */
  loadPlanProgress(): void {
    // TODO: this.marketingService.getPlanProgress(this.currentProjectId).subscribe(res => {
    //   this.completedSteps = res.completedSteps;
    //   this.totalSteps     = res.totalSteps;
    //   this.planProgress   = Math.round((this.completedSteps / this.totalSteps) * 100);
    //   this.updateStepsStatus();
    // });
  }

  /**
   * ENDPOINT: GET /api/v1/marketing/chart-data?project_id=:id
   * يُحدّث:
   *   - monthlyContentData (content performance chart)
   *   - channelsPerformance (channels radar chart)
   * بعد التحديث يُعاد بناء الشارتين عبر createAllCharts()
   */
  loadChartData(): void {
    // TODO: this.marketingService.getChartData(this.currentProjectId).subscribe(res => {
    //   this.monthlyContentData  = res.monthlyContent;
    //   this.channelsPerformance = res.channels;
    //   setTimeout(() => this.createAllCharts(), 100);
    // });
  }

  /**
   * ENDPOINT: GET /api/v1/marketing/engagement?project_id=:id&days=30
   * يُحدّث:
   *   - dailyEngagement[] (engagement timeline chart)
   *   - avgDailyEngagement, maxDailyEngagement (chart-foot)
   */
  loadEngagementData(): void {
    // TODO: this.marketingService.getEngagement(this.currentProjectId, 30).subscribe(res => {
    //   this.dailyEngagement = res.data;
    //   this.computeEngagementStats();
    //   setTimeout(() => this.createEngagementTimelineChart(), 100);
    // });
  }

  /**
   * ENDPOINT: GET /api/v1/marketing/content-ideas?project_id=:id
   * يُحدّث:
   *   - contentIdeas[] (AI IDEAS card)
   *   - filteredIdeas[] عبر filterPlatform()
   */
  loadContentIdeas(): void {
    // TODO: this.marketingService.getContentIdeas(this.currentProjectId).subscribe(res => {
    //   this.contentIdeas = res.ideas;
    //   this.filterPlatform(this.activePlatformFilter);
    // });
  }

  /**
   * ENDPOINT: GET /api/v1/marketing/scheduled-posts?project_id=:id
   * يُحدّث:
   *   - scheduledPosts[] (CONTENT SCHEDULE card)
   */
  loadScheduledPosts(): void {
    // TODO: this.marketingService.getScheduledPosts(this.currentProjectId).subscribe(res => {
    //   this.scheduledPosts = res.posts;
    // });
  }

  // ─────────────────────────────────────────────
  // PLAN PROGRESS HELPERS
  // ─────────────────────────────────────────────

  /** يُطبّق completedSteps على marketingSteps[] لتحديد status كل خطوة */
  updateStepsStatus(): void {
    this.marketingSteps.forEach((step, i) => {
      if (i < this.completedSteps)        step.status = 'completed';
      else if (i === this.completedSteps) step.status = 'active';
      else                                step.status = 'pending';
    });
  }

  // ─────────────────────────────────────────────
  // ENGAGEMENT STATS HELPERS
  // ─────────────────────────────────────────────

  /** يحسب avgDailyEngagement و maxDailyEngagement من dailyEngagement[] */
  computeEngagementStats(): void {
    if (!this.dailyEngagement.length) return;
    const sum = this.dailyEngagement.reduce((a, b) => a + b, 0);
    this.avgDailyEngagement = (sum / this.dailyEngagement.length).toFixed(0);
    this.maxDailyEngagement = Math.max(...this.dailyEngagement).toString();
  }

  // ─────────────────────────────────────────────
  // CONTENT IDEAS — AI GENERATION
  // ─────────────────────────────────────────────

  /**
   * ENDPOINT: POST /api/v1/marketing/generate-ideas
   * Body: { project_id, platform?: activePlatformFilter }
   * عند النجاح: يُضيف الأفكار الجديدة لـ contentIdeas ثم يُعيد filterPlatform()
   */
  generateAIContent(): void {
    this.isGeneratingAI = true;
    // TODO: this.marketingService.generateIdeas({ projectId: this.currentProjectId, platform: this.activePlatformFilter })
    //   .subscribe(res => {
    //     this.contentIdeas.unshift(...res.ideas);
    //     this.filterPlatform(this.activePlatformFilter);
    //     this.isGeneratingAI = false;
    //   });
  }

  // ─────────────────────────────────────────────
  // IDEA MODAL ACTIONS
  // ─────────────────────────────────────────────

  /** يفتح IDEA MODAL مع الفكرة المختارة */
  useIdea(idea: ContentIdea): void {
    this.selectedIdea  = idea;
    this.showIdeaModal = true;
  }

  closeIdeaModal(): void {
    this.showIdeaModal = false;
    this.selectedIdea  = null;
  }

  /**
   * ENDPOINT: POST /api/v1/marketing/scheduled-posts
   * Body: { project_id, title: selectedIdea.title, platform, status: 'draft' }
   * عند النجاح يُحدّث:
   *   - scheduledPosts[] (CONTENT SCHEDULE card)
   *   - scheduledContent++ (METRICS)
   */
  confirmUseIdea(): void {
    if (!this.selectedIdea) return;
    // TODO: this.marketingService.createPost({ ... }).subscribe(res => {
    //   this.scheduledPosts.unshift(res.post);
    //   this.scheduledContent++;
    // });
    this.closeIdeaModal();
  }

  // ─────────────────────────────────────────────
  // SCHEDULE MODAL ACTIONS
  // ─────────────────────────────────────────────

  /** يفتح SCHEDULE MODAL — اختياري مع فكرة مسبقة */
  createContent(idea?: ContentIdea): void {
    if (idea) {
      this.newPostTitle    = idea.title;
      this.newPostPlatform = idea.platform;
      this.selectedIdea    = idea;
    } else {
      this.newPostTitle    = '';
      this.newPostPlatform = 'instagram';
      this.selectedIdea    = null;
    }
    this.newPostTime      = '';
    this.showScheduleModal = true;
  }

  viewSchedule(): void { this.showScheduleModal = true; }

  closeScheduleModal(): void {
    this.showScheduleModal = false;
    this.selectedIdea      = null;
    this.newPostTitle      = '';
    this.newPostTime       = '';
  }

  /**
   * ENDPOINT: POST /api/v1/marketing/scheduled-posts
   * Body: { project_id, title, platform, scheduledTime, status: 'scheduled' }
   * عند النجاح يُحدّث:
   *   - scheduledPosts[] (CONTENT SCHEDULE card)
   *   - scheduledContent++ (METRICS)
   */
  confirmSchedulePost(): void {
    if (!this.newPostTitle.trim()) return;
    // TODO: this.marketingService.createPost({ ... }).subscribe(res => {
    //   this.scheduledPosts.unshift(res.post);
    //   this.scheduledContent++;
    // });
    this.closeScheduleModal();
  }

  // ─────────────────────────────────────────────
  // FILTER
  // ─────────────────────────────────────────────

  /** يُصفّي contentIdeas حسب المنصة ويُحدّث filteredIdeas */
  filterPlatform(platform: string): void {
    this.activePlatformFilter = platform;
    this.filteredIdeas = platform === 'all'
      ? [...this.contentIdeas]
      : this.contentIdeas.filter(i => i.platform === platform);
  }

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────

  viewAnalytics(): void { this.router.navigate(['/analytics']); }

  // ─────────────────────────────────────────────
  // GUIDE MODAL
  // ─────────────────────────────────────────────

  openGuide():  void { this.showGuide = true;  }
  closeGuide(): void { this.showGuide = false; }

  // ─────────────────────────────────────────────
  // CHARTS
  // ─────────────────────────────────────────────

  createAllCharts(): void {
    this.createContentPerformanceChart();
    this.createChannelsComparisonChart();
    this.createEngagementTimelineChart();
  }

  /**
   * يستخدم monthlyContentData.months / .posts / .engagement
   * يُبنى بعد loadChartData()
   */
  createContentPerformanceChart(): void {
    if (!this.contentChart) return;
    const ctx = this.contentChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.contentChartInstance?.destroy();
    this.contentChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthlyContentData.months,
        datasets: [
          {
            type: 'bar' as any, label: 'المنشورات',
            data: this.monthlyContentData.posts,
            backgroundColor: 'rgba(37,99,235,.65)', borderRadius: 6, yAxisID: 'y'
          },
          {
            type: 'line' as any, label: 'التفاعل (K)',
            data: this.monthlyContentData.engagement,
            borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,.1)',
            tension: 0.45, fill: true,
            pointBackgroundColor: '#fff', pointBorderColor: '#60a5fa',
            pointBorderWidth: 2, pointRadius: 4, yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { font: { family: 'Cairo', size: 11 }, usePointStyle: true, padding: 12 } } },
        scales: {
          y:  { type: 'linear', position: 'right', grid: { display: false },          ticks: { font: { family: 'Cairo', size: 10 } } },
          y1: { type: 'linear', position: 'left',  grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { family: 'Cairo', size: 10 } } },
          x:  { grid: { display: false },                                               ticks: { font: { family: 'Cairo', size: 10 } } }
        }
      }
    });
  }

  /**
   * يستخدم channelsPerformance.labels و .data
   * يُبنى بعد loadChartData()
   */
  createChannelsComparisonChart(): void {
    if (!this.channelsChart) return;
    const ctx = this.channelsChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.channelsChartInstance?.destroy();
    this.channelsChartInstance = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.channelsPerformance.labels,
        datasets: [{
          label: 'الأداء', data: this.channelsPerformance.data,
          backgroundColor: 'rgba(37,99,235,.12)', borderColor: '#2563EB', borderWidth: 2,
          pointBackgroundColor: '#2563EB', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, font: { family: 'Cairo', size: 9 } }, pointLabels: { font: { family: 'Cairo', size: 11 } } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  /**
   * يستخدم dailyEngagement[]
   * يُبنى بعد loadEngagementData()
   */
  createEngagementTimelineChart(): void {
    if (!this.engagementChart) return;
    const ctx = this.engagementChart.nativeElement.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(37,99,235,.22)');
    grad.addColorStop(1, 'rgba(37,99,235,0)');
    this.engagementChartInstance?.destroy();
    this.engagementChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: this.dailyEngagement.length }, (_, i) => `${i + 1}`),
        datasets: [{
          label: 'التفاعل اليومي', data: this.dailyEngagement,
          borderColor: '#2563EB', backgroundColor: grad,
          tension: 0.45, fill: true, pointRadius: 0, pointHoverRadius: 5,
          pointHoverBackgroundColor: '#2563EB', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { family: 'Cairo', size: 10 }, callback: (v) => Number(v).toLocaleString() } },
          x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 9 }, maxRotation: 0 } }
        }
      }
    });
  }

  destroyCharts(): void {
    this.contentChartInstance?.destroy();
    this.channelsChartInstance?.destroy();
    this.engagementChartInstance?.destroy();
  }

  // ─────────────────────────────────────────────
  // HELPERS — Labels & Icons
  // ─────────────────────────────────────────────

  /** Bootstrap Icons name للمنصة (بدون bi-) */
  getPlatformBiIcon(platform: string): string {
    const icons: { [key: string]: string } = {
      instagram: 'instagram',
      facebook:  'facebook',
      twitter:   'twitter-x',
      linkedin:  'linkedin',
      tiktok:    'tiktok'
    };
    return icons[platform] || 'phone';
  }

  getPlatformLabel(platform: string): string {
    const labels: { [key: string]: string } = {
      instagram: 'إنستجرام',
      facebook:  'فيسبوك',
      twitter:   'تويتر',
      linkedin:  'لينكد إن',
      tiktok:    'تيك توك'
    };
    return labels[platform] || platform;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      scheduled: 'مجدول',
      draft:     'مسودة',
      published: 'منشور',
      pending:   'قيد الانتظار'
    };
    return labels[status] || status;
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      high:   'عالية',
      medium: 'متوسطة',
      low:    'منخفضة'
    };
    return labels[priority] || priority;
  }
}