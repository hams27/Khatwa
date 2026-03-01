import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ProjectService, Project } from '../services/project';
import { FinanceService } from '../services/finance';
import { AiChatComponent } from '../ai-chat/ai-chat';

Chart.register(...registerables);

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

interface FinancialCard {
  title: string;
  value: string;
  percent: string;
  up: boolean;
  loading?: boolean;
}

interface Transaction {
  id?: number;
  title: string;
  date: string;
  amount: number;
  type: 'revenue' | 'expense' | 'pending';
  category?: string;
  description?: string;
}

interface ChartData {
  labels: string[];
  datasets: any[];
}

/** نموذج إضافة معاملة جديدة — يُستخدم في مودال الإضافة */
interface NewTransaction {
  type: 'revenue' | 'expense';
  title: string;
  amount: number | null;
  category: string;
  description: string;
  date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-financial-overview',
  imports: [SideBar, CommonModule, FormsModule, AiChatComponent],
  templateUrl: './financial-overview.html',
  styleUrl: './financial-overview.css',
  standalone: true
})
export class FinancialOverview implements OnInit, AfterViewInit, OnDestroy {

  // ─── مراجع العناصر (ViewChild) ────────────────────────────────────────────

  /** مرجع السايدبار لاستدعاء openMobile() عند الموبايل */
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  /** كانفاس مخطط الإيرادات مقابل المصروفات (قسم CHARTS — chart-card wide) */
  @ViewChild('revenueExpenseChart') revenueExpenseChartCanvas!: ElementRef<HTMLCanvasElement>;

  /** كانفاس مخطط توزيع المصروفات دونات (قسم CHARTS — chart-card) */
  @ViewChild('expenseDistributionChart') expenseDistributionChartCanvas!: ElementRef<HTMLCanvasElement>;

  /** كانفاس مخطط الاتجاه الشهري (قسم CHARTS — chart-card full-width أول) */
  @ViewChild('monthlyTrendChart') monthlyTrendChartCanvas!: ElementRef<HTMLCanvasElement>;

  /** كانفاس مخطط هامش الربح الشهري (قسم CHARTS — chart-card full-width ثاني) */
  @ViewChild('profitMarginChart') profitMarginChartCanvas!: ElementRef<HTMLCanvasElement>;

  // ─── كائنات Chart.js الداخلية ─────────────────────────────────────────────
  private revenueExpenseChart: any      = null;
  private expenseDistributionChart: any = null;
  private monthlyTrendChart: any        = null;
  private profitMarginChart: any        = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — يستخدمها قسم TOP NAV
  // ─────────────────────────────────────────────────────────────────────────────

  /** حالة تحميل الصفحة — يُشغّل .loading-overlay */
  isLoading = false;

  /** رسالة الخطأ — تظهر في .error-banner */
  errorMessage = '';

  /** رسالة النجاح — تظهر في .success-banner */
  successMessage = '';

  /** التحكم في ظهور مودال الدليل */
  showGuide = false;

  /** حالة السايدبار (مفتوح/مطوي) — يضاف class sidebar-collapsed على .top-nav و .finance-main */
  isSidebarCollapsed = false;

  /** الفترة الزمنية المحددة من أزرار التوب بار (أسبوع/شهر/ربع/سنة) */
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';

  // ─── بيانات المشروع الحالي ────────────────────────────────────────────────
  currentProject: Project | null = null;
  currentProjectId: number = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — يستخدمها قسم METRICS (metrics-grid)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * بيانات كروت المقاييس الأربعة:
   * [0] إجمالي الإيرادات | [1] إجمالي المصروفات | [2] صافي الربح | [3] هامش الربح
   *
   * ⬇️ يأخذ بياناته من: loadFinancialSummary() → GET /projects/:id/finance/summary
   * ⬇️ يتحدث أيضاً من: saveTransaction() عند إضافة معاملة جديدة
   */
  cards: FinancialCard[] = [
    { title: 'إجمالي الإيرادات', value: '0 ر.س', percent: '+0%', up: true,  loading: true },
    { title: 'إجمالي المصروفات', value: '0 ر.س', percent: '+0%', up: false, loading: true },
    { title: 'صافي الربح',       value: '0 ر.س', percent: '+0%', up: true,  loading: true },
    { title: 'هامش الربح',       value: '0%',     percent: '+0%', up: true,  loading: true }
  ];

  /** إجمالي الإيرادات — يُستخدم في WELCOME badges, METRICS, CHARTS, BOTTOM GRID */
  totalRevenue  = 0;

  /** إجمالي المصروفات — يُستخدم في METRICS, CHARTS, BOTTOM GRID */
  totalExpenses = 0;

  /**
   * صافي الربح (totalRevenue - totalExpenses)
   * يُستخدم في: WELCOME badges, METRICS, مودال الإضافة (profit-preview), BOTTOM GRID
   * ⬇️ يُغذّي: الدائرة SVG [style.stroke-dashoffset]="314-(314*profitMargin/100)"
   */
  profit = 0;

  /**
   * هامش الربح بالنسبة المئوية
   * يُستخدم في: METRICS [3], CHARTS (chip %), BOTTOM GRID (circ-pct), مودال التحليل
   */
  profitMargin = 0;

  // ─── نطاق التاريخ للفلترة ────────────────────────────────────────────────
  startDate: string = '';
  endDate: string   = '';

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — يستخدمها قسم TRANSACTIONS (آخر المعاملات)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * قائمة المعاملات المالية المعروضة في .tx-list
   *
   * ⬇️ تأتي من: loadFinancialRecords() → GET /projects/:id/finance
   * ⬇️ تتحدث من: saveTransaction() عند إضافة معاملة جديدة (unshift)
   * ⬆️ تُغذّي: buildAnalyticsData() لحساب توزيع الفئات في مودال التحليل
   * ⬆️ تُغذّي: exportReport() → report-summary → transactions.length
   */
  transactions: Transaction[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — يستخدمه مودال إضافة المعاملة (ADD TRANSACTION MODAL)
  // ─────────────────────────────────────────────────────────────────────────────

  /** تحكم في ظهور مودال الإضافة */
  showAddModal = false;

  /** نوع المعاملة المراد إضافتها (إيراد/مصروف) */
  addModalType: 'revenue' | 'expense' = 'revenue';

  /** حالة إرسال الفورم */
  isSubmitting = false;

  /** بيانات الفورم المرتبطة بـ ngModel */
  newTransaction: NewTransaction = {
    type: 'revenue',
    title: '',
    amount: null,
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  };

  /** أخطاء التحقق من الفورم */
  formErrors: { title?: string; amount?: string; category?: string } = {};

  /** فئات الإيرادات المتاحة في قائمة الاختيار */
  revenueCategories = ['خدمات رقمية', 'تطوير', 'تصميم', 'استشارات', 'عقود', 'مبيعات', 'أخرى'];

  /** فئات المصروفات المتاحة في قائمة الاختيار */
  expenseCategories = ['رواتب', 'إيجار', 'تسويق', 'تقنية', 'مواصلات', 'معدات', 'متفرقات'];

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — يستخدمه مودال تصدير التقرير (EXPORT REPORT MODAL)
  // ─────────────────────────────────────────────────────────────────────────────

  /** تحكم في ظهور مودال التقرير */
  showReportModal = false;

  /** نوع التقرير المختار */
  reportType: 'summary' | 'transactions' | 'categories' = 'summary';

  /** الفترة الزمنية المختارة في مودال التقرير */
  reportPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';

  /** حالة التصدير */
  isExporting = false;

  // ─────────────────────────────────────────────────────────────────────────────
  // STATE — يستخدمه مودال التحليل التفصيلي (ANALYTICS MODAL)
  // ─────────────────────────────────────────────────────────────────────────────

  /** تحكم في ظهور مودال التحليل */
  showAnalyticsModal = false;

  /**
   * توزيع المصروفات حسب الفئة للأشرطة
   * ⬇️ تُحسب من: transactions[] → buildAnalyticsData()
   */
  expensesByCategory: { name: string; amount: number; pct: number; color: string }[] = [];

  /**
   * توزيع الإيرادات حسب الفئة للأشرطة
   * ⬇️ تُحسب من: transactions[] → buildAnalyticsData()
   */
  revenuesByCategory: { name: string; amount: number; pct: number }[] = [];

  /** الرؤى والتوصيات — تُحسب من profitMargin و transactions[] */
  insights: { type: string; icon: string; text: string }[] = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // بيانات الرسوم البيانية — تبدأ فارغة وتُملأ من الـ API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * بيانات مخطط الأعمدة: الإيرادات مقابل المصروفات مقابل الربح
   * ⬇️ تُحدَّث من: loadFinancialSummary() / saveTransaction()
   */
  revenueExpenseData: ChartData = {
    labels: ['الإيرادات', 'المصروفات', 'صافي الربح'],
    datasets: [{
      label: 'المبلغ (ر.س)',
      data: [0, 0, 0],
      backgroundColor: ['rgba(31,153,80,.75)', 'rgba(229,57,53,.75)', 'rgba(30,136,229,.75)'],
      borderColor:     ['#1f9950', '#e53935', '#1e88e5'],
      borderWidth: 2, borderRadius: 8
    }]
  };

  /**
   * بيانات مخطط الدونات: توزيع المصروفات حسب الفئة
   * ⬇️ تُحدَّث من: processChartData() ← loadFinancialRecords()
   */
  expenseDistributionData: ChartData = {
    labels: [],
    datasets: [{ data: [], backgroundColor: ['#1f9950','#00e676','#1e88e5','#7c4dff','#ffa726','#e53935'], borderWidth: 0 }]
  };

  /**
   * بيانات مخطط الخط: الاتجاه الشهري للإيرادات والمصروفات
   * ⬇️ تُحدَّث من: processChartData() ← loadFinancialRecords()
   * ⬆️ تُغذّي: calculateProfitMargins() لحساب بيانات مخطط هامش الربح
   */
  monthlyTrendData: ChartData = {
    labels: [],
    datasets: [
      { label: 'الإيرادات',  data: [], borderColor: '#1f9950', backgroundColor: 'rgba(31,153,80,.12)',  tension: 0.4, fill: true, pointRadius: 4 },
      { label: 'المصروفات', data: [], borderColor: '#e53935', backgroundColor: 'rgba(229,57,53,.08)', tension: 0.4, fill: true, pointRadius: 4 }
    ]
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR & LIFECYCLE HOOKS
  // ─────────────────────────────────────────────────────────────────────────────

  constructor(
    private projectService: ProjectService,
    private financeService: FinanceService
  ) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadCurrentProject();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void { this.destroyCharts(); }

  // ─────────────────────────────────────────────────────────────────────────────
  // MODAL — إضافة معاملة جديدة
  // يُستدعى من: زر "إضافة إيراد" و"تسجيل مصروف" في قسم الإجراءات السريعة (act-btn)
  // ─────────────────────────────────────────────────────────────────────────────

  openAddModal(type: 'revenue' | 'expense') {
    this.addModalType = type;
    this.newTransaction = {
      type, title: '', amount: null, category: '', description: '',
      date: new Date().toISOString().split('T')[0]
    };
    this.formErrors   = {};
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.formErrors   = {};
  }

  /**
   * يُرجع فئات القائمة بناءً على نوع المعاملة
   * ⬆️ يُستهلك في HTML داخل select *ngFor="let cat of modalCategories"
   */
  get modalCategories(): string[] {
    return this.addModalType === 'revenue' ? this.revenueCategories : this.expenseCategories;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────

  validateForm(): boolean {
    this.formErrors = {};
    let valid = true;
    if (!this.newTransaction.title.trim())                              { this.formErrors.title    = 'العنوان مطلوب'; valid = false; }
    if (!this.newTransaction.amount || this.newTransaction.amount <= 0) { this.formErrors.amount   = 'أدخل مبلغاً صحيحاً أكبر من صفر'; valid = false; }
    if (!this.newTransaction.category)                                  { this.formErrors.category = 'اختر الفئة'; valid = false; }
    return valid;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SAVE TRANSACTION
  // endpoint: POST /api/v1/projects/:projectId/finance
  // body: {
  //   type:        'revenue' | 'expense',
  //   description: string,
  //   amount:      number,
  //   category:    string,
  //   date:        string  (YYYY-MM-DD),
  //   note:        string  (اختياري)
  // }
  // response: { data: { id, type, amount, category, description, date, createdAt } }
  //
  // بعد نجاح الحفظ يُحدَّث:
  //   - totalRevenue / totalExpenses / profit / profitMargin
  //   - cards[] (METRICS)
  //   - transactions[] (آخر المعاملات) — unshift في الأعلى
  //   - revenueExpenseChart
  // ─────────────────────────────────────────────────────────────────────────────

  saveTransaction() {
    if (!this.validateForm()) return;

    this.isSubmitting   = true;
    const isRevenue     = this.addModalType === 'revenue';

    const record = {
      type:        this.addModalType,
      description: this.newTransaction.title.trim(),
      amount:      this.newTransaction.amount!,
      category:    this.newTransaction.category,
      date:        this.newTransaction.date,
      note:        this.newTransaction.description
    };

    this.financeService.addRecord(this.currentProjectId, record as any).subscribe({
      next: (response: any) => {
        const saved = response?.data;

        // تحديث الإجماليات
        if (isRevenue) this.totalRevenue  += record.amount;
        else           this.totalExpenses += record.amount;

        this.profit       = this.totalRevenue - this.totalExpenses;
        this.profitMargin = this.totalRevenue > 0 ? Math.round((this.profit / this.totalRevenue) * 100) : 0;

        // تحديث كروت METRICS
        this.cards[0].value = this.formatCurrency(this.totalRevenue);
        this.cards[1].value = this.formatCurrency(this.totalExpenses);
        this.cards[2].value = this.formatCurrency(this.profit);
        this.cards[2].up    = this.profit >= 0;
        this.cards[3].value = `${this.profitMargin}%`;
        this.cards[3].up    = this.profitMargin >= 0;

        // إضافة المعاملة في أول قائمة TRANSACTIONS
        const newTx: Transaction = {
          id:          saved?.id || Date.now(),
          title:       record.description,
          date:        'الآن',
          amount:      isRevenue ? record.amount : -record.amount,
          type:        this.addModalType,
          category:    record.category,
          description: record.note
        };
        this.transactions.unshift(newTx);

        // تحديث مخطط الأعمدة
        this.revenueExpenseData.datasets[0].data = [this.totalRevenue, this.totalExpenses, Math.max(this.profit, 0)];
        if (this.revenueExpenseChart) { this.revenueExpenseChart.data = this.revenueExpenseData; this.revenueExpenseChart.update(); }

        this.successMessage = isRevenue
          ? `<i class="bi bi-check-circle-fill"></i> تم إضافة إيراد: ${this.formatCurrency(record.amount)}`
          : `<i class="bi bi-check-circle-fill"></i> تم تسجيل مصروف: ${this.formatCurrency(record.amount)}`;
        setTimeout(() => this.successMessage = '', 3000);

        this.isSubmitting = false;
        this.closeAddModal();
      },
      error: () => {
        this.errorMessage = 'حدث خطأ أثناء حفظ المعاملة. حاول مرة أخرى.';
        this.isSubmitting = false;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // API CALLS
  // ─────────────────────────────────────────────────────────────────────────────

  initializeDates() {
    const now      = new Date();
    this.endDate   = now.toISOString().split('T')[0];
    const ago      = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.startDate = ago.toISOString().split('T')[0];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects
  // response: { data: Project[] }
  // يجلب المشروع الأول ويحفظ currentProjectId ثم يُشغّل loadFinancialData()
  // ─────────────────────────────────────────────────────────────────────────────

  loadCurrentProject() {
    this.isLoading = true;
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        if (response?.data?.length > 0) {
          this.currentProject   = response.data[0];
          this.currentProjectId = this.currentProject!.id!;
          this.loadFinancialData();
        } else {
          this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
          this.isLoading    = false;
        }
      },
      error: () => { this.errorMessage = 'حدث خطأ في تحميل المشاريع'; this.isLoading = false; }
    });
  }

  loadFinancialData() {
    this.loadFinancialSummary();
    this.loadFinancialRecords();
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
  // يُغذّي: totalRevenue, totalExpenses, profit, profitMargin
  //          cards[] (METRICS), revenueExpenseData (CHARTS — chart-card wide)
  // ─────────────────────────────────────────────────────────────────────────────

  loadFinancialSummary() {
    this.financeService.getSummary(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response?.data) {
          const d            = response.data;
          this.totalRevenue  = d.totalRevenue  || 0;
          this.totalExpenses = d.totalExpenses || 0;
          this.profit        = d.profit        || 0;
          this.profitMargin  = d.profitMargin  || 0;
          this.updateCards(d);
          this.revenueExpenseData.datasets[0].data = [this.totalRevenue, this.totalExpenses, Math.max(this.profit, 0)];
        }
        this.isLoading = false;
        setTimeout(() => this.initializeCharts(), 100);
      },
      error: () => {
        this.errorMessage = 'حدث خطأ في تحميل الملخص المالي';
        this.isLoading    = false;
        this.cards.forEach(c => c.loading = false);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: GET /api/v1/projects/:projectId/finance
  // query params: startDate?, endDate?
  // response: {
  //   data: Array<{
  //     id:          number,
  //     type:        'revenue' | 'expense',
  //     amount:      string | number,
  //     category:    string,
  //     description: string,
  //     date:        string  (ISO format)
  //   }>
  // }
  // يُغذّي: transactions[] (آخر 10 للعرض في .tx-list)
  //          expenseDistributionData (CHARTS — دونات)
  //          monthlyTrendData (CHARTS — خط شهري + هامش الربح)
  // ─────────────────────────────────────────────────────────────────────────────

  loadFinancialRecords() {
    this.financeService.getRecords(this.currentProjectId, this.startDate, this.endDate).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.transactions = response.data.slice(0, 10).map((r: any) => ({
            id:          r.id,
            title:       r.description || r.category,
            date:        this.getRelativeTime(r.date),
            amount:      r.type === 'expense' ? -Math.abs(parseFloat(r.amount)) : Math.abs(parseFloat(r.amount)),
            type:        r.type,
            category:    r.category,
            description: r.description
          }));
          this.processChartData(response.data);
        }
      },
      error: () => { this.errorMessage = 'حدث خطأ في تحميل سجل المعاملات'; }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // endpoint: DELETE /api/v1/projects/:projectId/finance/:recordId
  // response: { message: string }
  // اربط بزر الحذف في tx-item عند إضافته في HTML مثلاً:
  //   <button (click)="deleteTransaction(tx.id!)">حذف</button>
  // بعد النجاح: يُزيل المعاملة من transactions[] ويُعيد تحميل الملخص
  // ─────────────────────────────────────────────────────────────────────────────

  deleteTransaction(recordId: number) {
    this.financeService.deleteRecord(recordId, this.currentProjectId).subscribe({
      next: () => {
        this.transactions = this.transactions.filter(t => t.id !== recordId);
        this.loadFinancialSummary();
        this.successMessage = '<i class="bi bi-check-circle-fill"></i> تم حذف المعاملة بنجاح';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => { this.errorMessage = 'حدث خطأ أثناء حذف المعاملة'; }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UPDATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * يُحدّث cards[] بعد جلب الملخص من API
   * ⬅️ يأخذ البيانات من: loadFinancialSummary() response
   * ⬆️ يُغذّي: قسم METRICS في HTML
   */
  updateCards(data: any) {
    this.cards[0].value = this.formatCurrency(data.totalRevenue  || 0); this.cards[0].loading = false;
    this.cards[1].value = this.formatCurrency(data.totalExpenses || 0); this.cards[1].loading = false;
    this.cards[2].value = this.formatCurrency(data.profit        || 0); this.cards[2].loading = false; this.cards[2].up = (data.profit || 0) >= 0;
    this.cards[3].value = `${(data.profitMargin || 0).toFixed(1)}%`;    this.cards[3].loading = false; this.cards[3].up = (data.profitMargin || 0) >= 0;
  }

  /**
   * يُعالج كل سجلات المعاملات لاستخراج بيانات الرسوم البيانية
   * ⬅️ يأخذ البيانات من: loadFinancialRecords() → response.data (كامل السجلات)
   * ⬆️ يُغذّي: expenseDistributionData (دونات), monthlyTrendData (خط شهري)
   */
  processChartData(records: any[]) {
    const expByCategory = this.groupByCategory(records.filter((r: any) => r.type === 'expense'));
    this.expenseDistributionData.labels           = Object.keys(expByCategory);
    this.expenseDistributionData.datasets[0].data = Object.values(expByCategory);

    const monthly = this.getMonthlyData(records);
    this.monthlyTrendData.labels           = monthly.months;
    this.monthlyTrendData.datasets[0].data = monthly.revenue;
    this.monthlyTrendData.datasets[1].data = monthly.expenses;

    this.updateCharts();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHART HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  groupByCategory(records: any[]): { [key: string]: number } {
    return records.reduce((acc, r) => {
      const cat = r.category || 'أخرى';
      acc[cat]  = (acc[cat] || 0) + Math.abs(parseFloat(r.amount));
      return acc;
    }, {});
  }

  getMonthlyData(records: any[]) {
    const md: { [k: string]: { revenue: number; expenses: number } } = {};
    records.forEach(r => {
      const d = new Date(r.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!md[k]) md[k] = { revenue: 0, expenses: 0 };
      if (r.type === 'revenue') md[k].revenue  += Math.abs(parseFloat(r.amount));
      else if (r.type === 'expense') md[k].expenses += Math.abs(parseFloat(r.amount));
    });
    const sorted = Object.keys(md).sort();
    return {
      months:   sorted.map(m => this.formatMonthLabel(m)),
      revenue:  sorted.map(m => md[m].revenue),
      expenses: sorted.map(m => md[m].expenses)
    };
  }

  formatMonthLabel(key: string) {
    const months = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return months[parseInt(key.split('-')[1]) - 1];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHART.JS — تهيئة وتحديث وتدمير
  // يُستدعى من: loadFinancialSummary() بعد setTimeout(100ms) لضمان رسم الـ DOM
  // ─────────────────────────────────────────────────────────────────────────────

  initializeCharts() {
    this.destroyCharts();

    // مخطط الأعمدة: الإيرادات مقابل المصروفات (#revenueExpenseChart)
    if (this.revenueExpenseChartCanvas) {
      const ctx = this.revenueExpenseChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.revenueExpenseChart = new Chart(ctx, {
        type: 'bar', data: this.revenueExpenseData,
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${(c.parsed.y ?? 0).toLocaleString('ar-SA')} ر.س` } } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${(typeof v === 'number' ? v : 0).toLocaleString('ar-SA')} ر.س` } } } }
      });
    }

    // مخطط الدونات: توزيع المصروفات (#expenseDistributionChart)
    if (this.expenseDistributionChartCanvas) {
      const ctx = this.expenseDistributionChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.expenseDistributionChart = new Chart(ctx, {
        type: 'doughnut', data: this.expenseDistributionData,
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => `${c.label}: ${(typeof c.parsed === 'number' ? c.parsed : 0).toLocaleString('ar-SA')} ر.س` } } } }
      });
    }

    // مخطط الخط: الاتجاه الشهري (#monthlyTrendChart)
    if (this.monthlyTrendChartCanvas) {
      const ctx = this.monthlyTrendChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.monthlyTrendChart = new Chart(ctx, {
        type: 'line', data: this.monthlyTrendData,
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${(c.parsed.y ?? 0).toLocaleString('ar-SA')} ر.س` } } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${(typeof v === 'number' ? v : 0).toLocaleString('ar-SA')} ر.س` } } } }
      });
    }

    // مخطط الخط: هامش الربح الشهري (#profitMarginChart)
    // ⬅️ يأخذ بياناته من monthlyTrendData عبر calculateProfitMargins()
    if (this.profitMarginChartCanvas) {
      const ctx = this.profitMarginChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.profitMarginChart = new Chart(ctx, {
        type: 'line',
        data: { labels: this.monthlyTrendData.labels, datasets: [{ label: 'هامش الربح %', data: this.calculateProfitMargins(), borderColor: 'rgb(153,102,255)', backgroundColor: 'rgba(153,102,255,.2)', tension: 0.4, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${(c.parsed.y ?? 0).toFixed(1)}%` } } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${v}%` } } } }
      });
    }
  }

  /**
   * يحسب هامش الربح لكل شهر
   * ⬅️ يأخذ من monthlyTrendData.datasets[0] (إيرادات) و datasets[1] (مصروفات)
   * ⬆️ يُغذّي: profitMarginChart
   */
  calculateProfitMargins() {
    const rev = this.monthlyTrendData.datasets[0].data as number[];
    const exp = this.monthlyTrendData.datasets[1].data as number[];
    return rev.map((r, i) => r > 0 ? ((r - exp[i]) / r) * 100 : 0);
  }

  updateCharts() {
    if (this.expenseDistributionChart) { this.expenseDistributionChart.data = this.expenseDistributionData; this.expenseDistributionChart.update(); }
    if (this.monthlyTrendChart)        { this.monthlyTrendChart.data = this.monthlyTrendData; this.monthlyTrendChart.update(); }
    if (this.profitMarginChart)        { this.profitMarginChart.data.datasets[0].data = this.calculateProfitMargins(); this.profitMarginChart.update(); }
  }

  destroyCharts() {
    [this.revenueExpenseChart, this.expenseDistributionChart, this.monthlyTrendChart, this.profitMarginChart]
      .forEach(c => { if (c) c.destroy(); });
    this.revenueExpenseChart = this.expenseDistributionChart = this.monthlyTrendChart = this.profitMarginChart = null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PERIOD SELECTOR — تغيير الفترة الزمنية
  // يُستدعى من: أزرار الفترة في TOP NAV (period-btn)
  // endpoint: GET /api/v1/projects/:id/finance/summary  (عبر loadFinancialSummary)
  // endpoint: GET /api/v1/projects/:id/finance          (عبر loadFinancialRecords)
  // ─────────────────────────────────────────────────────────────────────────────

  changePeriod(period: 'week' | 'month' | 'quarter' | 'year') {
    this.selectedPeriod = period;
    const now           = new Date();
    this.endDate        = now.toISOString().split('T')[0];
    const days          = { week: 7, month: 30, quarter: 90, year: 365 };
    const ago           = new Date(now.getTime() - days[period] * 24 * 60 * 60 * 1000);
    this.startDate      = ago.toISOString().split('T')[0];
    this.loadFinancialData();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // زر تحديث في TOP NAV
  // endpoint: GET /api/v1/projects/:id/finance/summary  (عبر loadFinancialSummary)
  // endpoint: GET /api/v1/projects/:id/finance          (عبر loadFinancialRecords)
  // ─────────────────────────────────────────────────────────────────────────────

  refreshFinancialData() { this.loadFinancialData(); }

  // ─────────────────────────────────────────────────────────────────────────────
  // REPORT MODAL — تصدير تقرير مالي
  // يُستدعى من: زر "تصدير تقرير" في الإجراءات السريعة (act-btn act-report)
  // ─────────────────────────────────────────────────────────────────────────────

  openReportModal()  { this.showReportModal = true; }
  closeReportModal() { this.showReportModal = false; }

  /**
   * يُولّد ملف CSV محلياً بدون endpoint
   * ⬅️ يأخذ من: totalRevenue, totalExpenses, profit, profitMargin, transactions[]
   *
   * إذا أردت تصديراً من الـ Backend:
   * endpoint: GET /api/v1/projects/:projectId/finance/export
   * query: type=summary|transactions|categories & period=week|month|quarter|year
   * response: Blob (CSV أو PDF)
   */
  exportReport() {
    this.isExporting = true;
    const lines: string[]  = [];
    const now              = new Date().toLocaleDateString('ar-SA');
    const periodLabels: Record<string, string> = { week: 'أسبوع', month: 'شهر', quarter: 'ربع سنة', year: 'سنة كاملة' };

    lines.push('تقرير مالي - خطوة');
    lines.push('التاريخ: ' + now);
    lines.push('الفترة: '  + periodLabels[this.reportPeriod]);
    lines.push('');
    lines.push('===== الملخص المالي =====');
    lines.push('إجمالي الإيرادات: ' + this.formatCurrency(this.totalRevenue));
    lines.push('إجمالي المصروفات: ' + this.formatCurrency(this.totalExpenses));
    lines.push('صافي الربح: '       + this.formatCurrency(this.profit));
    lines.push('هامش الربح: '       + this.profitMargin + '%');

    if (this.reportType !== 'summary') {
      lines.push('');
      lines.push('===== سجل المعاملات =====');
      lines.push('العنوان,النوع,الفئة,المبلغ,التاريخ');
      this.transactions.forEach(tx => {
        const type = tx.type === 'revenue' ? 'إيراد' : 'مصروف';
        lines.push(`${tx.title},${type},${tx.category || ''},${Math.abs(tx.amount)},${tx.date}`);
      });
    }

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `تقرير-مالي-${now.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setTimeout(() => {
      this.isExporting    = false;
      this.closeReportModal();
      this.successMessage = '<i class="bi bi-check-circle-fill"></i> تم تصدير التقرير بنجاح';
      setTimeout(() => this.successMessage = '', 3000);
    }, 1200);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS MODAL — التحليل التفصيلي
  // يُستدعى من: زر "تحليل تفصيلي" في الإجراءات السريعة (act-btn act-chart)
  //
  // البيانات تُحسب محلياً من transactions[]
  // إذا أردت تحليلاً أعمق:
  // endpoint: GET /api/v1/projects/:projectId/finance/analytics
  // query: startDate?, endDate?
  // response: { expensesByCategory, revenuesByCategory, monthlyTrends, insights }
  // ─────────────────────────────────────────────────────────────────────────────

  openAnalyticsModal() { this.buildAnalyticsData(); this.showAnalyticsModal = true; }
  closeAnalyticsModal() { this.showAnalyticsModal = false; }

  /**
   * يبني بيانات مودال التحليل من transactions[] المحلية
   * ⬅️ يأخذ من: transactions[], totalRevenue, totalExpenses, profitMargin
   * ⬆️ يُغذّي: expensesByCategory, revenuesByCategory, insights في HTML
   */
  buildAnalyticsData() {
    const expMap: Record<string, number> = {};
    const revMap: Record<string, number> = {};

    this.transactions.forEach(tx => {
      const cat = tx.category || 'أخرى';
      if (tx.type === 'expense') expMap[cat] = (expMap[cat] || 0) + Math.abs(tx.amount);
      if (tx.type === 'revenue') revMap[cat] = (revMap[cat] || 0) + tx.amount;
    });

    const expColors = ['red', 'blue', 'purple', 'orange', 'green'];
    const sortedExp = Object.entries(expMap).sort((a, b) => b[1] - a[1]);
    const maxExp    = sortedExp[0]?.[1] || 1;

    this.expensesByCategory = sortedExp.map(([name, amount], i) => ({
      name, amount, pct: Math.round((amount / maxExp) * 100), color: expColors[i % expColors.length]
    }));

    const sortedRev = Object.entries(revMap).sort((a, b) => b[1] - a[1]);
    const maxRev    = sortedRev[0]?.[1] || 1;

    this.revenuesByCategory = sortedRev.map(([name, amount]) => ({
      name, amount, pct: Math.round((amount / maxRev) * 100)
    }));

    this.insights = [];

    if (this.profitMargin >= 40)
      this.insights.push({ type: 'good', icon: 'bi bi-trophy-fill',              text: `هامش الربح <strong>${this.profitMargin}%</strong> ممتاز — أنت تُدير مشروعك بكفاءة عالية.` });
    else if (this.profitMargin >= 20)
      this.insights.push({ type: 'info', icon: 'bi bi-graph-up-arrow',            text: `هامش الربح <strong>${this.profitMargin}%</strong> جيد — يمكن تحسينه بتقليل المصروفات التشغيلية.` });
    else
      this.insights.push({ type: 'warn', icon: 'bi bi-exclamation-triangle-fill', text: `هامش الربح <strong>${this.profitMargin}%</strong> منخفض — راجع بنود المصروفات لتحسين الربحية.` });

    const topExp = sortedExp[0];
    if (topExp) {
      const pct = this.totalExpenses > 0 ? Math.round((topExp[1] / this.totalExpenses) * 100) : 0;
      this.insights.push({ type: 'info', icon: 'bi bi-lightbulb-fill', text: `أكبر بند مصروفات هو <strong>${topExp[0]}</strong> بنسبة <strong>${pct}%</strong> من إجمالي المصروفات.` });
    }

    const topRev = sortedRev[0];
    if (topRev) {
      const pct = this.totalRevenue > 0 ? Math.round((topRev[1] / this.totalRevenue) * 100) : 0;
      this.insights.push({ type: 'good', icon: 'bi bi-star-fill', text: `أكبر مصدر إيراد هو <strong>${topRev[0]}</strong> بنسبة <strong>${pct}%</strong> من إجمالي الإيرادات.` });
    }

    if (this.totalRevenue > this.totalExpenses * 1.5)
      this.insights.push({ type: 'good', icon: 'bi bi-rocket-takeoff-fill', text: 'إيراداتك تتجاوز مصروفاتك بنسبة كبيرة — المشروع في وضع مالي قوي.' });
  }

  /**
   * يحسب متوسط قيمة المعاملة
   * ⬅️ يأخذ من: transactions[]
   * ⬆️ يُستهلك في HTML: {{ getAvgTransaction() }}
   */
  getAvgTransaction(): string {
    if (!this.transactions.length) return '0 ر.س';
    const total = this.transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
    return this.formatCurrency(Math.round(total / this.transactions.length));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITY HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  formatCurrency(amount: number) {
    return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ر.س`;
  }

  formatPercent(value: number) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  getRelativeTime(dateString: string) {
    if (!dateString) return 'اليوم';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'أمس';
    if (diff < 7)   return `منذ ${diff} أيام`;
    if (diff < 30)  return `منذ ${Math.floor(diff / 7)} أسابيع`;
    return `منذ ${Math.floor(diff / 30)} أشهر`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIDEBAR & NAV
  // ─────────────────────────────────────────────────────────────────────────────

  onSidebarToggle(collapsed: boolean) { this.isSidebarCollapsed = collapsed; }
  openSidebar() { this.sidebarComponent?.openMobile(); }
  openGuide()   { this.showGuide = true;  }
  closeGuide()  { this.showGuide = false; }
}