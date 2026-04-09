import { CommonModule }          from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink }    from '@angular/router';
import { FormsModule }           from '@angular/forms';
import { Subject, takeUntil }    from 'rxjs';
import { Chart, registerables }  from 'chart.js';
import { SideBar }               from '../side-bar/side-bar';
import { AiChatComponent }       from '../ai-chat/ai-chat';
import { MarketingService, MarketingPlan } from '../services/marketing';
import { ProjectService }        from '../services/project';
import { AiService }             from '../services/ai';
import { CommunityService }      from '../services/community';

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

  marketingSteps: MarketingStep[] = []; // Initialize empty instead of with default data

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
  filteredIdeas: ContentIdea[] = []; // Initially empty, wait for user action

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
    private projectService:   ProjectService,
    private aiService:        AiService,
    private communityService: CommunityService,
    private cdr:              ChangeDetectorRef
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
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        if (res.data && res.data.length > 0) {
          this.currentProjectId = res.data[0].id;
          
          // Load Onboarding AI Analysis for Marketing Plan
          if (res.data[0].onboardingData && res.data[0].onboardingData.aiAnalysisResult) {
             let aiData = res.data[0].onboardingData.aiAnalysisResult;
             if (typeof aiData === 'string') {
                try { aiData = JSON.parse(aiData); } catch(e) {}
             }
             
             if (aiData.roadmap && Array.isArray(aiData.roadmap)) {
                this.marketingSteps = aiData.roadmap.map((step: any) => ({
                   title: step.step,
                   description: step.description,
                   status: 'pending' // Default to pending unless tracked elsewhere
                }));
                this.totalSteps = this.marketingSteps.length;
                this.completedSteps = 0; // Reset or calculate if tracked
                this.planProgress = 0;
                this.cdr.detectChanges(); // Force update immediately after loading AI roadmap
             }
          }

          this.loadDashboardData();
        }
      },
      error: (err) => console.error('Error loading projects:', err)
    });
  }

  loadDashboardData(): void {
    if (!this.currentProjectId) return;

    this.marketingService.getDashboard(this.currentProjectId).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const data = res.data;

          // 1. Stats
          this.publishedContent   = data.publishedContent?.count || 0;
          this.scheduledContent   = data.scheduledContent?.count || 0;
          this.totalEngagement    = (data.totalEngagement || 0).toString();
          this.contentGrowth      = data.publishedContent?.growth || 0;
          // engagementProgress could be calculated or come from API. Using 0 for now.
          this.engagementProgress = 0;

          // 2. Plan Progress
          this.planProgress   = data.planProgress?.percentage || 0;
          if (data.planProgress?.milestones && data.planProgress.milestones.length > 0) {
            // ONLY override if we didn't load any steps from AI yet
            if (this.marketingSteps.length === 0) {
                 this.marketingSteps = data.planProgress.milestones.map((m: any) => ({
                  title: m.title,
                  description: m.subtitle,
                  status: m.status
                }));
                this.totalSteps = this.marketingSteps.length;
                this.completedSteps = this.marketingSteps.filter(s => s.status === 'completed').length;
            }
          }

          // 3. Charts Data
          if (data.contentPerformance) {
            this.monthlyContentData.months = data.contentPerformance.map((d: any) => d.monthAr || d.month);
            this.monthlyContentData.posts = data.contentPerformance.map((d: any) => d.posts);
            this.monthlyContentData.engagement = data.contentPerformance.map((d: any) => d.engagement);
          }

          if (data.channelPerformance) {
            this.channelsPerformance.labels = Object.keys(data.channelPerformance);
            this.channelsPerformance.data = Object.values(data.channelPerformance);
          }

          // 4. Engagement Data
          if (data.dailyEngagement) {
            this.dailyEngagement = data.dailyEngagement.chartData.map((d: any) => d.count);
            this.avgDailyEngagement = (data.dailyEngagement.dailyAverage || 0).toString();
            this.maxDailyEngagement = (data.dailyEngagement.highestDay || 0).toString();
          }

          // 5. Content Ideas (Wait for user action, don't load default dashboard ideas)
          // We removed this block to keep the list empty until the user clicks 'Generate Ideas'
          /*
          if (data.smartIdeas) {
            this.contentIdeas = data.smartIdeas.map((idea: any) => ({
              id: idea.id.toString(),
              title: idea.title,
              description: idea.subtitle,
              platform: idea.platform,
              type: idea.format,
              priority: idea.impact === 'high' ? 'high' : 'medium'
            }));
            this.filterPlatform(this.activePlatformFilter);
          }
          */

          // 6. Scheduled Posts
          if (data.upcomingContent) {
            this.scheduledPosts = data.upcomingContent.map((post: any) => ({
              id: post.id.toString(),
              title: post.title,
              scheduledTime: post.timeLabel || '',
              platform: post.platform || 'instagram',
              status: post.status
            }));
          }

          // Render Charts
          setTimeout(() => {
            this.createAllCharts();
            this.createEngagementTimelineChart();
            this.cdr.detectChanges(); // Final update after all data is loaded
          }, 100);
        }
      },
      error: (err) => console.error('Error loading marketing dashboard:', err)
    });
  }

  // Legacy methods (can be removed or kept empty if referenced by template)
  loadStats() {}
  loadPlanProgress() {}
  loadChartData() {}
  loadEngagementData() {}
  loadContentIdeas() {}
  loadScheduledPosts() {}

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

  /**
   * يُبدِّل حالة الخطوة عند النقر عليها:
   *   pending/active → completed
   *   completed      → pending
   * ثم يُعيد حساب completedSteps و planProgress لتحديث الدائرة فوراً
   * ENDPOINT (عند الربط): PATCH /api/v1/marketing/plan-progress
   *   Body: { project_id, stepIndex: i, status }
   */
  toggleStep(index: number): void {
    const step = this.marketingSteps[index];

    // Toggle: مكتمل → قادم | قادم/جارٍ → مكتمل
    if (step.status === 'completed') {
      step.status = 'pending';
    } else {
      step.status = 'completed';
    }

    // أعد حساب عدد الخطوات المكتملة
    this.completedSteps = this.marketingSteps.filter(s => s.status === 'completed').length;

    // تحديث planProgress → يُحرّك الدائرة فوراً
    this.planProgress = this.totalSteps > 0
      ? Math.round((this.completedSteps / this.totalSteps) * 100)
      : 0;

    // TODO: أرسل التحديث للـ API
    // this.marketingService.updateStepStatus(this.currentProjectId, index, step.status)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe();
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
    if (!this.currentProjectId) return;
    this.isGeneratingAI = true;
    this.cdr.detectChanges(); // Force UI update to show loading state

    this.aiService.generateContentIdeas(this.currentProjectId, this.activePlatformFilter)
      .subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            const newIdeas = res.data.map((idea: any) => ({
              id: idea.id ? idea.id.toString() : Date.now().toString(),
              title: idea.title,
              description: idea.subtitle || idea.description, // Fallback to description if subtitle is missing
              platform: idea.platform,
              type: idea.format || 'post',
              priority: idea.impact === 'high' ? 'high' : 'medium'
            }));
            
            // Overwrite existing ideas or unshift? Let's overwrite so it feels fresh
            this.contentIdeas = newIdeas;
            this.filterPlatform(this.activePlatformFilter);
          }
          this.isGeneratingAI = false;
          this.cdr.detectChanges(); // Force UI update with new data
        },
        error: (err) => {
          console.error('Error generating ideas:', err);
          this.isGeneratingAI = false;
          this.cdr.detectChanges(); // Force UI update to clear loading state
        }
      });
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
    if (!this.selectedIdea || !this.currentProjectId) return;
    
    const postData = {
      projectId: this.currentProjectId,
      title: this.selectedIdea.title,
      content: this.selectedIdea.description,
      platform: this.selectedIdea.platform,
      status: 'draft' as const
    };

    this.communityService.createPost(postData).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const post = res.data;
          this.scheduledPosts.unshift({
            id: post.id.toString(),
            title: post.title,
            scheduledTime: '',
            platform: post.platform || 'instagram',
            status: 'draft'
          });
          this.scheduledContent++;
        }
        this.closeIdeaModal();
      },
      error: (err) => {
        console.error('Error creating post:', err);
        // Still close modal or show error
        this.closeIdeaModal();
      }
    });
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
    if (!this.newPostTitle.trim() || !this.currentProjectId) return;

    const postData = {
      projectId: this.currentProjectId,
      title: this.newPostTitle,
      content: this.selectedIdea?.description || this.newPostTitle,
      platform: this.newPostPlatform,
      scheduledAt: this.newPostTime || undefined,
      status: this.newPostTime ? 'scheduled' as const : 'draft' as const
    };

    this.communityService.createPost(postData).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const post = res.data;
          this.scheduledPosts.unshift({
            id: post.id.toString(),
            title: post.title,
            scheduledTime: post.scheduledAt || '',
            platform: post.platform || 'instagram',
            status: post.status as any
          });
          this.scheduledContent++;
        }
        this.closeScheduleModal();
      },
      error: (err) => {
        console.error('Error creating scheduled post:', err);
        this.closeScheduleModal();
      }
    });
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