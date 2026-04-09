import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';
import { AiChatComponent } from '../ai-chat/ai-chat';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface ReportTemplate {
  id: number;
  title: string;
  description: string;
  biIcon: string;  // اسم أيقونة Bootstrap Icons (بدون bi-)
  type: 'financial' | 'marketing' | 'tasks' | 'team' | 'comprehensive' | 'custom';
  color: string;
}

export interface SavedReport {
  id: number;
  title: string;
  status: 'ready' | 'draft' | 'processing';
  date: string;
  views: number;
  author: string;
  type: string;
  format: 'pdf' | 'excel';
}

export interface ReportOptions {
  type: 'financial' | 'marketing' | 'tasks' | 'team' | 'comprehensive' | 'custom';
  startDate: string;
  endDate: string;
  format: 'pdf' | 'excel';
}

export interface CustomSection {
  id: string;
  label: string;
  selected: boolean;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

@Component({
  selector: 'app-reports',
  imports: [CommonModule, SideBar, FormsModule, AiChatComponent],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
  standalone: true
})
export class Reports implements OnInit, AfterViewInit, OnDestroy {

  // ── References ──
  @ViewChild('sidebarRef')   sidebarComponent?: SideBar;
  @ViewChild('reportsChart') reportsChartCanvas!: ElementRef<HTMLCanvasElement>;

  // ── حالة الصفحة ──
  isLoading    = false;
  isGenerating = false;
  errorMessage  = '';
  successMessage = '';
  isSidebarCollapsed = false;

  // ── إحصائيات الرأس
  //    totalReports   ← API: GET /api/v1/reports/stats
  //    totalDownloads ← stats.totalDownloads
  //    totalShares    ← stats.totalShares
  //    totalViews     ← stats.totalViews
  //    تُعرض في قسمي WELCOME و METRICS
  totalReports   = 0;
  totalDownloads = 0;
  totalShares    = 0;
  totalViews     = 0;

  // ── قوالب التقارير — يمكن تحميلها من API أو إبقاؤها ثابتة
  reportTemplates: ReportTemplate[] = [
    { id: 1, title: 'تقرير الأداء الشامل', description: 'نظرة شاملة على جميع جوانب المشروع', biIcon: 'bar-chart',        type: 'comprehensive', color: '#3b82f6' },
    { id: 2, title: 'التقرير المالي',       description: 'الإيرادات والمصروفات والأرباح',       biIcon: 'currency-dollar',  type: 'financial',     color: '#1f9950' },
    { id: 3, title: 'تقرير التسويق',        description: 'أداء الحملات والمحتوى التسويقي',      biIcon: 'graph-up-arrow',   type: 'marketing',     color: '#f97316' },
    { id: 4, title: 'تقرير المهام',         description: 'المهام المكتملة والمعلقة والمتأخرة',  biIcon: 'check2-square',    type: 'tasks',         color: '#8b5cf6' },
    { id: 5, title: 'تقرير الفريق',         description: 'إنتاجية الفريق والمهام المكتملة',    biIcon: 'people',           type: 'team',          color: '#ec4899' },
    { id: 6, title: 'تقرير مخصص',           description: 'اختر العناصر التي تريد تضمينها',     biIcon: 'sliders',          type: 'custom',        color: '#06b6d4' },
  ];

  // ── التقارير المحفوظة
  //    savedReportsList ← API: GET /api/v1/reports
  //    filteredReports  ← مشتقة من savedReportsList عبر filterReports()
  savedReportsList: SavedReport[] = [];
  filteredReports: SavedReport[]  = [];
  searchQuery         = '';
  selectedTypeFilter  = 'all';

  // ── خيارات إنشاء تقرير جديد (يُرسَل لـ API عبر generateReport)
  reportOptions: ReportOptions = {
    type:      'financial',
    startDate: this.getFirstDayOfMonth(),
    endDate:   this.getToday(),
    format:    'pdf'
  };

  // ── أقسام التقرير المخصص — تُرسَل مع generateReport للـ API
  customSections: CustomSection[] = [
    { id: 'overview',   label: 'نظرة عامة',       selected: true  },
    { id: 'financial',  label: 'البيانات المالية', selected: true  },
    { id: 'tasks',      label: 'المهام',           selected: false },
    { id: 'team',       label: 'الفريق',           selected: false },
    { id: 'marketing',  label: 'التسويق',          selected: false },
    { id: 'analytics',  label: 'التحليلات',        selected: false },
  ];

  // ── حالات الـ UI ──
  showCreateModal = false;
  showCustomModal = false;
  showGuide       = false;
  private chart: Chart | null = null;

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  ngOnInit(): void {
    this.loadStats();
    this.loadReports();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initChart(), 200);
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
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
   * ENDPOINT: GET /api/v1/reports/stats
   * يُحدّث: totalReports، totalDownloads، totalShares، totalViews
   * هذه القيم تُعرض في WELCOME و METRICS
   */
  loadStats(): void {
    // TODO: استبدل بـ http.get('/api/v1/reports/stats').subscribe(...)
    this.totalReports   = 0;
    this.totalDownloads = 0;
    this.totalShares    = 0;
    this.totalViews     = 0;
  }

  /**
   * ENDPOINT: GET /api/v1/reports
   * يُحدّث: savedReportsList و filteredReports
   * filteredReports هي المصدر الذي يعرضه قسم "التقارير المحفوظة" في HTML
   */
  loadReports(): void {
    this.isLoading = true;
    // TODO: استبدل بـ http.get('/api/v1/reports').subscribe(res => { ... })
    this.savedReportsList = [];
    this.filteredReports  = [];
    this.isLoading = false;
  }

  /**
   * ENDPOINT: GET /api/v1/reports/activity  (بيانات الرسم البياني — آخر 7 أشهر)
   * البيانات تُستخدم في initChart() لرسم الـ Chart
   * TODO: استبدل البيانات الوهمية بالاستجابة الفعلية من API
   */
  initChart(): void {
    if (!this.reportsChartCanvas) return;
    const ctx = this.reportsChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // TODO: labels و data تأتي من API بعد التجهيز
    const labels = ['أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس', 'أبريل'];
    const data   = [0, 0, 0, 0, 0, 0, 0];

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'عدد التقارير',
          data,
          backgroundColor: 'rgba(37,99,235,0.12)',
          borderColor:      '#2563EB',
          borderWidth:      2,
          borderRadius:     8,
          borderSkipped:    false,
          barThickness:     32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a2e5e', padding: 12,
            titleColor: '#93c5fd', bodyColor: '#fff',
            borderColor: '#2563EB', borderWidth: 1, displayColors: false,
            callbacks: { label: (c: any) => `عدد التقارير: ${c.parsed.y}` }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e8f0ff' }, ticks: { font: { family: 'Cairo', size: 11 }, color: '#93b4d4' } },
          x: { grid: { display: false },               ticks: { font: { family: 'Cairo', size: 11 }, color: '#93b4d4' } }
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // REPORT GENERATION
  // ─────────────────────────────────────────────

  /** يفتح موديل الإنشاء — إذا كان النوع custom يفتح موديل الأقسام */
  createReport(template: ReportTemplate): void {
    this.reportOptions.type = template.type;
    template.type === 'custom' ? (this.showCustomModal = true) : (this.showCreateModal = true);
  }

  createNewReport(): void { this.showCreateModal = true; }

  /**
   * ENDPOINT: POST /api/v1/reports/generate
   * Body: { type, startDate, endDate, format, sections? }
   * بعد النجاح يُضيف التقرير الجديد لـ savedReportsList ويُحدّث:
   *   - filteredReports (عبر filterReports)
   *   - totalReports، totalDownloads
   */
  generateReport(): void {
    if (new Date(this.reportOptions.startDate) > new Date(this.reportOptions.endDate)) {
      this.showError('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
      return;
    }

    this.isGenerating = true;
    const selectedSections = this.customSections.filter(s => s.selected).map(s => s.id);

    // TODO: استبدل بـ http.post('/api/v1/reports/generate', { ...this.reportOptions, sections: selectedSections }).subscribe(...)
    // مثال على الاستجابة المتوقعة:
    // { report: { id, title, status, date, views, author, type, format } }
    this.isGenerating    = false;
    this.showCreateModal = false;
    this.showCustomModal = false;
    this.showSuccess('تم إرسال طلب إنشاء التقرير بنجاح');
  }

  cancelReportGeneration(): void {
    this.showCreateModal = false;
    this.showCustomModal = false;
  }

  /** يُبدّل حالة القسم في قائمة customSections */
  toggleCustomSection(section: CustomSection): void {
    section.selected = !section.selected;
  }

  // ─────────────────────────────────────────────
  // FILTER & SEARCH
  // ─────────────────────────────────────────────

  /**
   * يُطبّق selectedTypeFilter و searchQuery على savedReportsList
   * يُحدّث filteredReports التي يعرضها HTML في قسم "التقارير المحفوظة"
   */
  filterReports(): void {
    let list = [...this.savedReportsList];
    if (this.selectedTypeFilter !== 'all') {
      list = list.filter(r => r.type === this.selectedTypeFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q)
      );
    }
    this.filteredReports = list;
  }

  // ─────────────────────────────────────────────
  // REPORT ACTIONS
  // ─────────────────────────────────────────────

  /**
   * ENDPOINT: POST /api/v1/reports/:id/view
   * يُحدّث report.views و totalViews (المعروضَين في METRICS و WELCOME)
   */
  viewReport(report: SavedReport): void {
    // TODO: http.post(`/api/v1/reports/${report.id}/view`, {}).subscribe(...)
    report.views++;
    this.totalViews++;
    this.showSuccess(`جاري فتح "${report.title}"`);
  }

  /**
   * ENDPOINT: GET /api/v1/reports/:id/download
   * يُحدّث totalDownloads (المعروض في METRICS و WELCOME)
   */
  downloadReport(report: SavedReport): void {
    // TODO: http.get(`/api/v1/reports/${report.id}/download`, { responseType: 'blob' }).subscribe(...)
    this.totalDownloads++;
    this.showSuccess(`جاري تحميل "${report.title}" بصيغة ${report.format.toUpperCase()}`);
  }

  /**
   * يُحدّث totalShares (المعروض في METRICS)
   * يمكن ربطه بـ API مشاركة لاحقاً
   */
  shareReport(report: SavedReport): void {
    this.totalShares++;
    this.showSuccess('تم نسخ رابط التقرير بنجاح');
  }

  /**
   * ENDPOINT: DELETE /api/v1/reports/:id
   * يُزيل التقرير من savedReportsList ثم يُعيد filterReports()
   * يُحدّث totalReports (المعروض في METRICS و WELCOME)
   */
  deleteReport(report: SavedReport): void {
    if (!confirm(`هل أنت متأكد من حذف "${report.title}"؟`)) return;
    // TODO: http.delete(`/api/v1/reports/${report.id}`).subscribe(...)
    this.savedReportsList = this.savedReportsList.filter(r => r.id !== report.id);
    this.filterReports();
    this.totalReports--;
    this.showSuccess('تم حذف التقرير بنجاح');
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /** يُرجع أيقونة Bootstrap Icons بناءً على نوع التقرير (يُستخدم في HTML) */
  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      financial:     'currency-dollar',
      marketing:     'graph-up-arrow',
      tasks:         'check2-square',
      team:          'people',
      comprehensive: 'bar-chart',
      custom:        'sliders'
    };
    return icons[type] || 'file-earmark';
  }

  /** يُرجع نص الحالة بالعربية */
  getStatusText(status: string): string {
    const map: { [key: string]: string } = {
      ready:      'جاهز',
      draft:      'مسودة',
      processing: 'قيد المعالجة'
    };
    return map[status] || status;
  }

  getFirstDayOfMonth(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  }

  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ─────────────────────────────────────────────
  // GUIDE MODAL
  // ─────────────────────────────────────────────

  openGuide():  void { this.showGuide = true;  }
  closeGuide(): void { this.showGuide = false; }

  // ─────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────

  showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }

  showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}