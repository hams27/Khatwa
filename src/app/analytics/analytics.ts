import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';
import { ProjectService, Project } from '../services/project';
import { FinanceService } from '../services/finance';
import { TaskService } from '../services/task';
import { interval, Subscription } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { AiChatComponent } from '../ai-chat/ai-chat';

Chart.register(...registerables);

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: string;   // Bootstrap icon class (e.g. 'bi bi-cash-stack')
  color: string;  // اسم اللون للـ CSS class (blue / green / purple / orange)
  loading?: boolean;
}

interface Insight {
  title:       string;
  description: string;
  confidence:  number;
  type: 'success' | 'info' | 'warning' | 'danger';
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector:    'app-analytics',
  imports:     [CommonModule, FormsModule, SideBar, AiChatComponent],
  templateUrl: './analytics.html',
  styleUrls:   ['./analytics.css'],
  standalone:  true
})
export class Analytics implements OnInit, OnDestroy, AfterViewInit {

  // ─── مراجع العناصر (ViewChild) ────────────────────────────────────────────

  /** مرجع السايدبار لاستدعاء openMobile() عند الموبايل */
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  /** كانفاس مخطط الأداء العام — خط متعدد المحاور (إيرادات + مهام + رضا) */
  @ViewChild('performanceChart')       performanceChart?:       ElementRef<HTMLCanvasElement>;

  /** كانفاس مخطط توقعات الإيرادات — فعلي vs متوقع */
  @ViewChild('revenueProjectionChart') revenueProjectionChart?: ElementRef<HTMLCanvasElement>;

  /** كانفاس مخطط إنجاز المهام — أعمدة مخطط vs مكتمل أسبوعياً */
  @ViewChild('taskCompletionChart')    taskCompletionChart?:    ElementRef<HTMLCanvasElement>;

  /** كانفاس مخطط اتجاهات النمو — خط ربعي (إيرادات + عملاء + حصة سوق) */
  @ViewChild('growthTrendChart')       growthTrendChart?:       ElementRef<HTMLCanvasElement>;

  // ─── كائنات Chart.js الداخلية ─────────────────────────────────────────────
  private performanceChartInstance?:       Chart;
  private revenueProjectionChartInstance?: Chart;
  private taskCompletionChartInstance?:    Chart;
  private growthTrendChartInstance?:       Chart;

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — TOP NAV
  // ─────────────────────────────────────────────────────────────────────────────

  /** حالة تحميل الصفحة — يُشغّل .loading-overlay */
  isLoading = false;

  /** رسالة الخطأ — تظهر في .error-banner */
  errorMessage = '';

  /** التحكم في ظهور مودال الدليل */
  showGuide = false;

  /** حالة السايدبار (مفتوح/مطوي) */
  isSidebarCollapsed = false;

  /** تفعيل التحديث التلقائي كل 5 دقائق */
  autoRefreshEnabled = false;

  // ─── بيانات المشروع الحالي ────────────────────────────────────────────────
  currentProject:   Project | null = null;
  currentProjectId: number = 0;
  private refreshSubscription?: Subscription;

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — METRICS (metrics-grid)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * كروت المقاييس الأربعة:
   * [0] إجمالي الإيرادات | [1] معدل إنجاز المهام | [2] المصروفات | [3] معدل النمو
   *
   * ⬇️ [0] يأخذ من: loadFinancialSummary() → GET /projects/:id/finance/summary
   * ⬇️ [1] يأخذ من: loadTaskStats()        → GET /projects/:id/tasks
   * ⬇️ [2] يأخذ من: loadFinancialSummary() → GET /projects/:id/finance/summary
   * ⬇️ [3] يُحسب محلياً: (revenue - expenses) / revenue * 100
   */
  statsCards: StatCard[] = [
    { title: 'إجمالي الإيرادات',  value: '0 ر.س', change: '+0%', icon: 'bi bi-cash-stack',       color: 'blue',   loading: true },
    { title: 'معدل إنجاز المهام', value: '0%',     change: '+0%', icon: 'bi bi-check-circle-fill', color: 'green',  loading: true },
    { title: 'المصروفات الشهرية', value: '0 ر.س', change: '+0%', icon: 'bi bi-bar-chart-fill',    color: 'purple', loading: true },
    { title: 'معدل النمو',         value: '0%',     change: '+0%', icon: 'bi bi-graph-up-arrow',    color: 'orange', loading: true }
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — INSIGHTS (الرؤى الذكية)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * قائمة الرؤى الذكية المعروضة في .insights-list
   * ⬇️ تُولَّد من: generateInsights() بعد وصول بيانات statsCards
   *
   * إذا أردت رؤى من الـ Backend:
   * endpoint: GET /api/v1/projects/:projectId/analytics/insights
   * response: { data: Insight[] }
   */
  insights: Insight[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // بيانات الرسوم البيانية — تبدأ فارغة وتُملأ من الـ API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * بيانات مخطط الأداء العام (#performanceChart — خط متعدد)
   * ⬇️ تُحدَّث من: loadPerformanceData() → GET /projects/:id/analytics/performance
   * response: { months, revenue[], taskCompletion[], satisfaction[] }
   */
  performanceData = {
    months:       [] as string[],
    revenue:      [] as number[],
    tasks:        [] as number[],
    satisfaction: [] as number[]
  };

  /**
   * بيانات مخطط توقعات الإيرادات (#revenueProjectionChart — خط)
   * ⬇️ تُحدَّث من: loadProjectionData() → GET /projects/:id/analytics/projection
   * response: { historical: number[], projected: number[] }
   */
  revenueProjectionData = {
    historical: [] as number[],
    projected:  [] as number[]
  };

  /**
   * بيانات مخطط إنجاز المهام (#taskCompletionChart — أعمدة)
   * ⬇️ تُحدَّث من: loadTaskStats() → GET /projects/:id/tasks
   * يُجمَّع أسبوعياً: planned (إجمالي) مقابل completed (status === 'done')
   */
  taskCompletionData = {
    weeks:     [] as string[],
    planned:   [] as number[],
    completed: [] as number[]
  };

  /**
   * بيانات مخطط اتجاهات النمو (#growthTrendChart — خط ربعي)
   * ⬇️ تُحدَّث من: loadGrowthData() → GET /projects/:id/analytics/growth
   * response: { quarters, revenue[], customers[], marketShare[] }
   */
  growthMetrics = {
    quarters:    [] as string[],
    revenue:     [] as number[],
    customers:   [] as number[],
    marketShare: [] as number[]
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — ملخص المؤشرات (SIDE COL)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * مؤشرات الأداء الرئيسية للعرض في .kpi-list
   * ⬇️ تُحدَّث من: loadKpiSummary() → GET /projects/:id/analytics/kpis
   * response: { topMonthlyRevenue, bestWeekCompletion, avgMonthlyGrowth, newCustomers, churnRate, satisfaction }
   */
  kpiSummary = {
    topMonthlyRevenue:   '—',
    bestWeekCompletion:  '—',
    avgMonthlyGrowth:    '—',
    newCustomers:        '—',
    churnRate:           '—',
    satisfaction:        '—'
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR & LIFECYCLE HOOKS
  // ─────────────────────────────────────────────────────────────────────────────

  constructor(
    private projectService: ProjectService,
    private financeService: FinanceService,
    private taskService:    TaskService
  ) {}

  ngOnInit(): void      { this.loadCurrentProject(); }
  ngAfterViewInit(): void {}
  ngOnDestroy(): void   { this.refreshSubscription?.unsubscribe(); this.destroyCharts(); }

  // ─────────────────────────────────────────────────────────────────────────────
  // API CALLS
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects
  // response: { data: Project[] }
  // يجلب المشروع الأول ويحفظ currentProjectId ثم يُشغّل loadAnalyticsData()
  // ─────────────────────────────────────────────────────────────────────────────

  loadCurrentProject() {
    this.isLoading = true;
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        if (response?.data?.length > 0) {
          this.currentProject   = response.data[0];
          this.currentProjectId = this.currentProject!.id!;
          this.loadAnalyticsData();
        } else {
          this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
          this.isLoading    = false;
        }
      },
      error: () => {
        this.errorMessage = 'حدث خطأ في تحميل المشاريع';
        this.isLoading    = false;
      }
    });
  }

  /** يُشغّل جميع طلبات البيانات معاً */
  loadAnalyticsData() {
    this.loadFinancialSummary();
    this.loadTaskStats();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/finance/summary
  // query params: startDate?, endDate?
  // response: {
  //   data: {
  //     totalRevenue:  number,
  //     totalExpenses: number,
  //     profit:        number,
  //     profitMargin:  number
  //   }
  // }
  // يُغذّي: statsCards[0] (إيرادات), statsCards[2] (مصروفات), statsCards[3] (نمو)
  // ─────────────────────────────────────────────────────────────────────────────

  loadFinancialSummary() {
    this.financeService.getSummary(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response?.data) {
          const d        = response.data;
          const revenue  = d.totalRevenue  || 0;
          const expenses = d.totalExpenses || 0;
          const growth   = revenue > 0 ? ((revenue - expenses) / revenue * 100) : 0;

          this.statsCards[0] = { ...this.statsCards[0], value: this.formatCurrency(revenue),  loading: false };
          this.statsCards[2] = { ...this.statsCards[2], value: this.formatCurrency(expenses), loading: false };
          this.statsCards[3] = { ...this.statsCards[3], value: `${growth.toFixed(1)}%`,       loading: false };

          // بيانات مخطط الأداء — الإيرادات الفعلية
          // TODO: استبدل بـ GET /api/v1/projects/:id/analytics/performance
          // لتحصل على مصفوفة شهرية بدلاً من رقم واحد
          this.revenueProjectionData.historical = [revenue];
        }
        this.isLoading = false;
        this.generateInsights();
        setTimeout(() => this.createAllCharts(), 100);
      },
      error: () => {
        this.errorMessage = 'حدث خطأ في تحميل البيانات المالية';
        this.isLoading    = false;
        this.statsCards.forEach(c => c.loading = false);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/tasks
  // response: {
  //   data: Array<{
  //     id:     number,
  //     title:  string,
  //     status: 'todo' | 'in_progress' | 'done',
  //     dueDate?: string
  //   }>
  // }
  // يُغذّي: statsCards[1] (معدل الإنجاز), taskCompletionData (مخطط الأعمدة)
  // ─────────────────────────────────────────────────────────────────────────────

  loadTaskStats() {
    this.taskService.getTasks(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response?.data) {
          const tasks     = response.data as any[];
          const total     = tasks.length;
          const completed = tasks.filter(t => t.status === 'done').length;
          const rate      = total > 0 ? (completed / total * 100) : 0;

          this.statsCards[1] = { ...this.statsCards[1], value: `${rate.toFixed(1)}%`, loading: false };

          // بناء بيانات مخطط إنجاز المهام أسبوعياً
          this.taskCompletionData = this.buildWeeklyTaskData(tasks);
        }
      },
      error: () => {
        this.statsCards[1].loading = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/analytics/performance
  // query params: startDate?, endDate?, period=month
  // response: {
  //   data: {
  //     months:         string[],
  //     revenue:        number[],
  //     taskCompletion: number[],
  //     satisfaction:   number[]
  //   }
  // }
  // يُغذّي: performanceData → performanceChart (مخطط الأداء العام)
  // ─────────────────────────────────────────────────────────────────────────────

  loadPerformanceData() {
    // TODO: اربط بـ this.financeService أو service مخصص للتحليلات
    // this.analyticsService.getPerformance(this.currentProjectId).subscribe({
    //   next: (response: any) => {
    //     if (response?.data) {
    //       this.performanceData = {
    //         months:       response.data.months,
    //         revenue:      response.data.revenue,
    //         tasks:        response.data.taskCompletion,
    //         satisfaction: response.data.satisfaction
    //       };
    //       this.createPerformanceChart();
    //     }
    //   }
    // });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/analytics/growth
  // query params: period=quarter
  // response: {
  //   data: {
  //     quarters:    string[],   // ['Q1', 'Q2', 'Q3', 'Q4']
  //     revenue:     number[],
  //     customers:   number[],
  //     marketShare: number[]    // نسبة مئوية
  //   }
  // }
  // يُغذّي: growthMetrics → growthTrendChart (مخطط اتجاهات النمو)
  // ─────────────────────────────────────────────────────────────────────────────

  loadGrowthData() {
    // TODO: اربط بـ service مخصص للتحليلات
    // this.analyticsService.getGrowth(this.currentProjectId).subscribe({
    //   next: (response: any) => {
    //     if (response?.data) {
    //       this.growthMetrics = response.data;
    //       this.createGrowthTrendChart();
    //     }
    //   }
    // });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/analytics/projection
  // response: {
  //   data: {
  //     historical: number[],   // آخر 6 أشهر فعلية
  //     projected:  number[]    // 6 أشهر قادمة متوقعة
  //   }
  // }
  // يُغذّي: revenueProjectionData → revenueProjectionChart (مخطط التوقعات)
  // ─────────────────────────────────────────────────────────────────────────────

  loadProjectionData() {
    // TODO: اربط بـ service مخصص للتحليلات
    // this.analyticsService.getProjection(this.currentProjectId).subscribe({
    //   next: (response: any) => {
    //     if (response?.data) {
    //       this.revenueProjectionData = response.data;
    //       this.createRevenueProjectionChart();
    //     }
    //   }
    // });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/analytics/kpis
  // response: {
  //   data: {
  //     topMonthlyRevenue:   number,
  //     bestWeekCompletion:  number,   // نسبة مئوية
  //     avgMonthlyGrowth:    number,   // نسبة مئوية
  //     newCustomers:        number,
  //     churnRate:           number,   // نسبة مئوية
  //     satisfaction:        number    // نسبة مئوية
  //   }
  // }
  // يُغذّي: kpiSummary → .kpi-list في الـ HTML
  // ─────────────────────────────────────────────────────────────────────────────

  loadKpiSummary() {
    // TODO: اربط بـ service مخصص للتحليلات
    // this.analyticsService.getKpis(this.currentProjectId).subscribe({
    //   next: (response: any) => {
    //     if (response?.data) {
    //       const d = response.data;
    //       this.kpiSummary = {
    //         topMonthlyRevenue:  this.formatCurrency(d.topMonthlyRevenue),
    //         bestWeekCompletion: `${d.bestWeekCompletion}%`,
    //         avgMonthlyGrowth:   `+${d.avgMonthlyGrowth}%`,
    //         newCustomers:       String(d.newCustomers),
    //         churnRate:          `${d.churnRate}%`,
    //         satisfaction:       `${d.satisfaction}%`
    //       };
    //     }
    //   }
    // });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/analytics/insights
  // response: {
  //   data: Array<{
  //     title:       string,
  //     description: string,
  //     confidence:  number,   // 0-100
  //     type:        'success' | 'info' | 'warning' | 'danger'
  //   }>
  // }
  // يُغذّي: insights[] → .insights-list في الـ HTML
  // حالياً: تُولَّد محلياً من generateInsights()
  // ─────────────────────────────────────────────────────────────────────────────

  generateInsights() {
    const revenue     = parseFloat(this.statsCards[0].value) || 0;
    const taskRate    = parseFloat(this.statsCards[1].value) || 0;
    const growthRate  = parseFloat(this.statsCards[3].value) || 0;

    this.insights = [];

    if (growthRate >= 15) {
      this.insights.push({ title: 'اتجاه إيجابي للإيرادات', description: `الإيرادات في نمو مستمر بمعدل ${growthRate.toFixed(1)}% مقارنة بالفترة السابقة`, confidence: 85, type: 'success' });
    } else if (growthRate > 0) {
      this.insights.push({ title: 'نمو معتدل للإيرادات', description: `معدل النمو ${growthRate.toFixed(1)}% — يمكن تحسينه بزيادة مصادر الإيراد`, confidence: 70, type: 'info' });
    } else {
      this.insights.push({ title: 'تراجع في الإيرادات', description: 'الإيرادات في تراجع — راجع مصادر الدخل والمصروفات', confidence: 80, type: 'danger' });
    }

    if (taskRate >= 75) {
      this.insights.push({ title: 'معدل إنجاز المهام جيد', description: `الفريق يحافظ على أداء ثابت بمعدل إنجاز ${taskRate.toFixed(1)}%`, confidence: 75, type: 'info' });
    } else if (taskRate > 0) {
      this.insights.push({ title: 'فرصة لتحسين الكفاءة', description: `معدل الإنجاز ${taskRate.toFixed(1)}% — يمكن تحسينه بإعادة توزيع الأولويات`, confidence: 70, type: 'warning' });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORT
  // endpoint: GET /api/v1/projects/:projectId/analytics/export
  // query: format=pdf|excel & period=month|quarter|year
  // response: Blob (PDF أو Excel)
  // حالياً: يعرض تنبيه مؤقت
  // ─────────────────────────────────────────────────────────────────────────────

  exportData(format: 'pdf' | 'excel') {
    // TODO: استبدل بطلب HTTP حقيقي:
    // this.analyticsService.export(this.currentProjectId, format).subscribe({
    //   next: (blob: Blob) => {
    //     const url = URL.createObjectURL(blob);
    //     const a   = document.createElement('a');
    //     a.href    = url;
    //     a.download = `analytics-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    //     a.click();
    //     URL.revokeObjectURL(url);
    //   }
    // });
    alert(`سيتم إضافة ميزة التصدير لـ ${format} قريباً`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATA HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * يُجمّع المهام أسبوعياً من مصفوفة Tasks
   * ⬅️ يأخذ من: loadTaskStats() → response.data
   * ⬆️ يُغذّي: taskCompletionData → taskCompletionChart
   */
  buildWeeklyTaskData(tasks: any[]): typeof this.taskCompletionData {
    const weeks: Record<string, { planned: number; completed: number }> = {};

    tasks.forEach(t => {
      const d   = t.dueDate ? new Date(t.dueDate) : new Date();
      const yr  = d.getFullYear();
      const wk  = this.getWeekNumber(d);
      const key = `${yr}-W${wk}`;
      if (!weeks[key]) weeks[key] = { planned: 0, completed: 0 };
      weeks[key].planned++;
      if (t.status === 'done') weeks[key].completed++;
    });

    const sorted = Object.keys(weeks).sort().slice(-4);
    return {
      weeks:     sorted.map((_, i) => `الأسبوع ${i + 1}`),
      planned:   sorted.map(k => weeks[k].planned),
      completed: sorted.map(k => weeks[k].completed)
    };
  }

  /** يُحسب رقم الأسبوع من التاريخ */
  getWeekNumber(date: Date): number {
    const d   = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow);
    const year = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - year.getTime()) / 86400000 + 1) / 7);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHART.JS — إنشاء وتدمير
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * يُنشئ جميع المخططات الأربعة
   * يُستدعى من: loadFinancialSummary() بعد setTimeout(100ms)
   */
  createAllCharts() {
    this.createPerformanceChart();
    this.createRevenueProjectionChart();
    this.createTaskCompletionChart();
    this.createGrowthTrendChart();
  }

  /**
   * مخطط الأداء العام (#performanceChart)
   * محاور: y (إيرادات ر.س) + y1 (نسب %)
   * ⬅️ يأخذ من: performanceData (يُملأ من loadPerformanceData)
   */
  createPerformanceChart() {
    if (!this.performanceChart) return;
    const ctx = this.performanceChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.performanceChartInstance?.destroy();
    this.performanceChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.performanceData.months.length ? this.performanceData.months : ['—'],
        datasets: [
          { label: 'الإيرادات (ر.س)', data: this.performanceData.revenue,      borderColor: 'rgb(37,99,235)',  backgroundColor: 'rgba(37,99,235,.1)',  tension: 0.4, fill: true, borderWidth: 2, yAxisID: 'y'  },
          { label: 'إنجاز المهام (%)', data: this.performanceData.tasks,        borderColor: 'rgb(16,185,129)', backgroundColor: 'rgba(16,185,129,.1)', tension: 0.4, fill: true, borderWidth: 2, yAxisID: 'y1' },
          { label: 'رضا العملاء (%)',  data: this.performanceData.satisfaction, borderColor: 'rgb(245,158,11)', backgroundColor: 'rgba(245,158,11,.1)', tension: 0.4, fill: true, borderWidth: 2, yAxisID: 'y1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { font: { family: 'Cairo', size: 12 }, usePointStyle: true, padding: 15 } } },
        scales: {
          y:  { beginAtZero: true, ticks: { font: { family: 'Cairo' }, callback: (v) => `${Number(v).toLocaleString()} ر.س` } },
          y1: { beginAtZero: true, position: 'right', max: 100, grid: { drawOnChartArea: false }, ticks: { font: { family: 'Cairo' }, callback: (v) => `${v}%` } },
          x:  { ticks: { font: { family: 'Cairo', size: 11 } } }
        }
      }
    });
  }

  /**
   * مخطط توقعات الإيرادات (#revenueProjectionChart)
   * ⬅️ يأخذ من: revenueProjectionData (يُملأ من loadProjectionData)
   */
  createRevenueProjectionChart() {
    if (!this.revenueProjectionChart) return;
    const ctx = this.revenueProjectionChart.nativeElement.getContext('2d');
    if (!ctx) return;
    const allMonths = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const hist      = this.revenueProjectionData.historical;
    const proj      = this.revenueProjectionData.projected;
    this.revenueProjectionChartInstance?.destroy();
    this.revenueProjectionChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allMonths,
        datasets: [
          { label: 'الفعلي',  data: hist.length ? [...hist, ...Array(12 - hist.length).fill(null)] : Array(12).fill(null), borderColor: 'rgb(37,99,235)',  backgroundColor: 'rgba(37,99,235,.1)',  tension: 0.4, fill: true, borderWidth: 2 },
          { label: 'المتوقع', data: proj.length ? [...Array(12 - proj.length).fill(null), ...proj]  : Array(12).fill(null), borderColor: 'rgb(16,185,129)', backgroundColor: 'rgba(16,185,129,.1)', tension: 0.4, fill: true, borderDash: [5,5], borderWidth: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { font: { family: 'Cairo', size: 12 }, usePointStyle: true, padding: 15 } } },
        scales: {
          y: { beginAtZero: true, ticks: { font: { family: 'Cairo' }, callback: (v) => `${Number(v).toLocaleString()} ر.س` } },
          x: { ticks: { font: { family: 'Cairo', size: 11 } } }
        }
      }
    });
  }

  /**
   * مخطط إنجاز المهام (#taskCompletionChart — أعمدة)
   * ⬅️ يأخذ من: taskCompletionData (يُملأ من buildWeeklyTaskData ← loadTaskStats)
   */
  createTaskCompletionChart() {
    if (!this.taskCompletionChart) return;
    const ctx = this.taskCompletionChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.taskCompletionChartInstance?.destroy();
    const labels = this.taskCompletionData.weeks.length ? this.taskCompletionData.weeks : ['الأسبوع 1','الأسبوع 2','الأسبوع 3','الأسبوع 4'];
    this.taskCompletionChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'المخطط',  data: this.taskCompletionData.planned,   backgroundColor: 'rgba(156,163,175,.5)', borderColor: 'rgb(156,163,175)', borderWidth: 2, borderRadius: 6 },
          { label: 'المكتمل', data: this.taskCompletionData.completed, backgroundColor: 'rgba(16,185,129,.7)',  borderColor: 'rgb(16,185,129)',  borderWidth: 2, borderRadius: 6 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { family: 'Cairo', size: 12 }, usePointStyle: true, padding: 15 } } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 5, font: { family: 'Cairo' } } },
          x: { ticks: { font: { family: 'Cairo' } } }
        }
      }
    });
  }

  /**
   * مخطط اتجاهات النمو (#growthTrendChart — خط ربعي)
   * ⬅️ يأخذ من: growthMetrics (يُملأ من loadGrowthData)
   */
  createGrowthTrendChart() {
    if (!this.growthTrendChart) return;
    const ctx = this.growthTrendChart.nativeElement.getContext('2d');
    if (!ctx) return;
    this.growthTrendChartInstance?.destroy();
    const labels = this.growthMetrics.quarters.length ? this.growthMetrics.quarters : ['Q1','Q2','Q3','Q4'];
    this.growthTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'الإيرادات (ر.س)', data: this.growthMetrics.revenue,     borderColor: 'rgb(59,130,246)',  backgroundColor: 'rgba(59,130,246,.1)',  tension: 0.4, fill: true, yAxisID: 'y'  },
          { label: 'العملاء',          data: this.growthMetrics.customers,   borderColor: 'rgb(16,185,129)', backgroundColor: 'rgba(16,185,129,.1)', tension: 0.4, fill: true, yAxisID: 'y1' },
          { label: 'حصة السوق (%)',    data: this.growthMetrics.marketShare, borderColor: 'rgb(245,158,11)', backgroundColor: 'rgba(245,158,11,.1)', tension: 0.4, fill: true, yAxisID: 'y2' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'top', labels: { font: { family: 'Cairo', size: 12 }, usePointStyle: true, padding: 15 } } },
        scales: {
          y:  { type: 'linear', position: 'left',   title: { display: true, text: 'الإيرادات',  font: { family: 'Cairo' } }, ticks: { font: { family: 'Cairo' } } },
          y1: { type: 'linear', position: 'right',  title: { display: true, text: 'العملاء',    font: { family: 'Cairo' } }, ticks: { font: { family: 'Cairo' } }, grid: { drawOnChartArea: false } },
          y2: { type: 'linear', display: false, max: 100 },
          x:  { ticks: { font: { family: 'Cairo' } } }
        }
      }
    });
  }

  /** يُدمّر جميع مثيلات Chart.js لتفادي تسرب الذاكرة */
  destroyCharts() {
    this.performanceChartInstance?.destroy();
    this.revenueProjectionChartInstance?.destroy();
    this.taskCompletionChartInstance?.destroy();
    this.growthTrendChartInstance?.destroy();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTO REFRESH — تحديث تلقائي كل 5 دقائق
  // ─────────────────────────────────────────────────────────────────────────────

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(300_000).subscribe(() => this.loadAnalyticsData());
    } else {
      this.refreshSubscription?.unsubscribe();
    }
  }

  /** يُستدعى من زر التحديث في TOP NAV */
  refreshAnalytics() { this.loadAnalyticsData(); }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITY HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ر.س`;
  }

  formatPercentage(value: number): string { return `${value.toFixed(1)}%`; }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIDEBAR & NAV
  // ─────────────────────────────────────────────────────────────────────────────

  onSidebarToggle(collapsed: boolean) { this.isSidebarCollapsed = collapsed; }
  openSidebar() { this.sidebarComponent?.openMobile(); }
  openGuide()   { this.showGuide = true;  }
  closeGuide()  { this.showGuide = false; }
}