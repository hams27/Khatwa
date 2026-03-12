import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ProjectService, Project } from '../services/project';
import { FinanceService } from '../services/finance';
import { HttpErrorResponse } from '@angular/common/http';
import { AiChatComponent } from '../ai-chat/ai-chat';

Chart.register(...registerables);

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

// ── نموذج إضافة معاملة جديدة ──
interface NewTransaction {
  type: 'revenue' | 'expense';
  title: string;
  amount: number | null;
  category: string;
  description: string;
  date: string;
}

@Component({
  selector: 'app-financial-overview',
  imports: [SideBar, CommonModule, FormsModule, AiChatComponent],
  templateUrl: './financial-overview.html',
  styleUrl: './financial-overview.css',
  standalone: true
})
export class FinancialOverview implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('sidebarRef') sidebarComponent?: SideBar;
  @ViewChild('revenueExpenseChart') revenueExpenseChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseDistributionChart') expenseDistributionChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyTrendChart') monthlyTrendChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('profitMarginChart') profitMarginChartCanvas!: ElementRef<HTMLCanvasElement>;

  private revenueExpenseChart: any = null;
  private expenseDistributionChart: any = null;
  private monthlyTrendChart: any = null;
  private profitMarginChart: any = null;

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showGuide = false;
  isSidebarCollapsed = false;

  currentProject: Project | null = null;
  currentProjectId: number = 0;

  cards: FinancialCard[] = [
    { title: 'إجمالي الإيرادات', value: '0 ر.س', percent: '+0%', up: true, loading: true },
    { title: 'إجمالي المصروفات', value: '0 ر.س', percent: '+0%', up: false, loading: true },
    { title: 'صافي الربح', value: '0 ر.س', percent: '+0%', up: true, loading: true },
    { title: 'هامش الربح', value: '0%', percent: '+0%', up: true, loading: true }
  ];

  transactions: Transaction[] = [];

  totalRevenue = 0;
  totalExpenses = 0;
  profit = 0;
  profitMargin = 0;

  selectedPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';
  startDate: string = '';
  endDate: string = '';

  // ── Modal State ──
  showAddModal = false;
  addModalType: 'revenue' | 'expense' = 'revenue';
  isSubmitting = false;

  // ── Report Modal ──
  showReportModal  = false;
  reportType: 'summary' | 'transactions' | 'categories' = 'summary';
  reportPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';
  isExporting = false;

  // ── Analytics Modal ──
  showAnalyticsModal = false;
  expensesByCategory: { name: string; amount: number; pct: number; color: string }[] = [];
  revenuesByCategory: { name: string; amount: number; pct: number }[] = [];
  insights: { type: string; icon: string; text: string }[] = [];

  revenueCategories = ['خدمات رقمية', 'تطوير', 'تصميم', 'استشارات', 'عقود', 'مبيعات', 'أخرى'];
  expenseCategories = ['رواتب', 'إيجار', 'تسويق', 'تقنية', 'مواصلات', 'معدات', 'متفرقات'];

  newTransaction: NewTransaction = {
    type: 'revenue',
    title: '',
    amount: null,
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  };

  formErrors: { title?: string; amount?: string; category?: string } = {};

  revenueExpenseData: ChartData = {
    labels: ['الإيرادات', 'المصروفات', 'الربح'],
    datasets: [{
      label: 'المبلغ (ر.س)',
      data: [0, 0, 0],
      backgroundColor: ['rgba(75,192,192,.6)', 'rgba(255,99,132,.6)', 'rgba(54,162,235,.6)'],
      borderColor: ['rgba(75,192,192,1)', 'rgba(255,99,132,1)', 'rgba(54,162,235,1)'],
      borderWidth: 2
    }]
  };

  expenseDistributionData: ChartData = {
    labels: [],
    datasets: [{ data: [], backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40'] }]
  };

  monthlyTrendData: ChartData = {
    labels: [],
    datasets: [
      { label: 'الإيرادات', data: [], borderColor: 'rgb(75,192,192)', backgroundColor: 'rgba(75,192,192,.2)', tension: 0.4, fill: true },
      { label: 'المصروفات', data: [], borderColor: 'rgb(255,99,132)', backgroundColor: 'rgba(255,99,132,.2)', tension: 0.4, fill: true }
    ]
  };

  constructor(private projectService: ProjectService, private financeService: FinanceService) {}

  ngOnInit(): void {
    this.initializeDates();
    this.loadMockData();
  }

  ngAfterViewInit(): void {}
  ngOnDestroy(): void { this.destroyCharts(); }

  // ===== MOCK DATA =====
  loadMockData() {
    this.isLoading = false;
    this.totalRevenue  = 128500;
    this.totalExpenses = 74300;
    this.profit        = 54200;
    this.profitMargin  = 42;

    this.cards = [
      { title: 'إجمالي الإيرادات', value: '128,500 ر.س', percent: '+18.4%', up: true,  loading: false },
      { title: 'إجمالي المصروفات', value: '74,300 ر.س',  percent: '+6.2%',  up: false, loading: false },
      { title: 'صافي الربح',       value: '54,200 ر.س',  percent: '+31.7%', up: true,  loading: false },
      { title: 'هامش الربح',       value: '42.2%',        percent: '+8.1%',  up: true,  loading: false },
    ];

    this.transactions = [
      { id:1,  title:'عقد خدمات تصميم موقع',   date:'اليوم',       amount: 18500, type:'revenue', category:'خدمات رقمية' },
      { id:2,  title:'فاتورة إيجار المكتب',     date:'أمس',         amount:-4500,  type:'expense', category:'إيجار'       },
      { id:3,  title:'مشروع تطوير تطبيق',       date:'منذ يومين',   amount: 32000, type:'revenue', category:'تطوير'       },
      { id:4,  title:'رواتب الفريق - فبراير',   date:'منذ 3 أيام',  amount:-22000, type:'expense', category:'رواتب'       },
      { id:5,  title:'استشارة تسويقية',          date:'منذ 4 أيام',  amount: 8200,  type:'revenue', category:'استشارات'   },
      { id:6,  title:'اشتراك أدوات SaaS',       date:'منذ 5 أيام',  amount:-1800,  type:'expense', category:'تقنية'       },
      { id:7,  title:'مشروع هوية بصرية',        date:'منذ أسبوع',   amount: 12000, type:'revenue', category:'تصميم'       },
      { id:8,  title:'حملة إعلانية - جوجل',     date:'منذ أسبوع',   amount:-5500,  type:'expense', category:'تسويق'       },
      { id:9,  title:'دفعة مقدمة - عميل جديد', date:'منذ أسبوعين', amount: 15000, type:'revenue', category:'عقود'        },
      { id:10, title:'فاتورة خدمات سحابية',     date:'منذ أسبوعين', amount:-2800,  type:'expense', category:'تقنية'       },
    ];

    this.revenueExpenseData = {
      labels: ['الإيرادات', 'المصروفات', 'صافي الربح'],
      datasets: [{ label:'المبلغ (ر.س)', data:[128500,74300,54200],
        backgroundColor:['rgba(31,153,80,.75)','rgba(229,57,53,.75)','rgba(30,136,229,.75)'],
        borderColor:['#1f9950','#e53935','#1e88e5'], borderWidth:2, borderRadius:8 }]
    };
    this.expenseDistributionData = {
      labels: ['رواتب','إيجار','تسويق','تقنية','متفرقات'],
      datasets: [{ data:[22000,4500,5500,4600,4700],
        backgroundColor:['#1f9950','#00e676','#1e88e5','#7c4dff','#ffa726'], borderWidth:0 }]
    };
    this.monthlyTrendData = {
      labels: ['سبتمبر','أكتوبر','نوفمبر','ديسمبر','يناير','فبراير'],
      datasets: [
        { label:'الإيرادات',  data:[68000,75000,82000,91000,110000,128500], borderColor:'#1f9950', backgroundColor:'rgba(31,153,80,.12)', tension:0.4, fill:true, pointRadius:4 },
        { label:'المصروفات', data:[52000,58000,61000,66000,70000,74300],  borderColor:'#e53935', backgroundColor:'rgba(229,57,53,.08)', tension:0.4, fill:true, pointRadius:4 }
      ]
    };
    setTimeout(() => this.initializeCharts(), 150);
  }

  // ===== MODAL - فتح وإغلاق =====
  openAddModal(type: 'revenue' | 'expense') {
    this.addModalType = type;
    this.newTransaction = {
      type,
      title: '',
      amount: null,
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    };
    this.formErrors = {};
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.formErrors = {};
  }

  get modalCategories(): string[] {
    return this.addModalType === 'revenue' ? this.revenueCategories : this.expenseCategories;
  }

  // ===== VALIDATION =====
  validateForm(): boolean {
    this.formErrors = {};
    let valid = true;

    if (!this.newTransaction.title.trim()) {
      this.formErrors.title = 'العنوان مطلوب';
      valid = false;
    }
    if (!this.newTransaction.amount || this.newTransaction.amount <= 0) {
      this.formErrors.amount = 'أدخل مبلغاً صحيحاً أكبر من صفر';
      valid = false;
    }
    if (!this.newTransaction.category) {
      this.formErrors.category = 'اختر الفئة';
      valid = false;
    }
    return valid;
  }

  // ===== حفظ المعاملة وتحديث الأرقام =====
  saveTransaction() {
    if (!this.validateForm()) return;

    this.isSubmitting = true;

    const amount = this.newTransaction.amount!;
    const isRevenue = this.addModalType === 'revenue';

    // ── تحديث الإجماليات ──
    if (isRevenue) {
      this.totalRevenue += amount;
    } else {
      this.totalExpenses += amount;
    }

    this.profit       = this.totalRevenue - this.totalExpenses;
    this.profitMargin = this.totalRevenue > 0
      ? Math.round((this.profit / this.totalRevenue) * 100)
      : 0;

    // ── تحديث الكروت ──
    this.cards[0].value = this.formatCurrency(this.totalRevenue);
    this.cards[1].value = this.formatCurrency(this.totalExpenses);
    this.cards[2].value = this.formatCurrency(this.profit);
    this.cards[2].up    = this.profit >= 0;
    this.cards[3].value = `${this.profitMargin}%`;
    this.cards[3].up    = this.profitMargin >= 0;

    // ── إضافة المعاملة للقائمة ──
    const newTx: Transaction = {
      id: Date.now(),
      title:    this.newTransaction.title.trim(),
      date:     'الآن',
      amount:   isRevenue ? amount : -amount,
      type:     this.addModalType,
      category: this.newTransaction.category,
      description: this.newTransaction.description
    };
    this.transactions.unshift(newTx);

    // ── تحديث الرسوم البيانية ──
    this.revenueExpenseData.datasets[0].data = [
      this.totalRevenue, this.totalExpenses, Math.max(this.profit, 0)
    ];
    if (this.revenueExpenseChart) {
      this.revenueExpenseChart.data = this.revenueExpenseData;
      this.revenueExpenseChart.update();
    }

    // ── رسالة نجاح ──
    this.successMessage = isRevenue
      ? `✅ تم إضافة إيراد: ${this.formatCurrency(amount)}`
      : `✅ تم تسجيل مصروف: ${this.formatCurrency(amount)}`;
    setTimeout(() => this.successMessage = '', 3000);

    this.isSubmitting = false;
    this.closeAddModal();
  }

  // ===== باقي الدوال بدون تغيير =====
  initializeDates() {
    const now = new Date();
    this.endDate   = now.toISOString().split('T')[0];
    const ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.startDate = ago.toISOString().split('T')[0];
  }

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
          this.isLoading = false;
        }
      },
      error: () => { this.errorMessage = 'حدث خطأ في تحميل المشاريع'; this.isLoading = false; }
    });
  }

  loadFinancialData() { this.loadFinancialSummary(); this.loadFinancialRecords(); }

  loadFinancialSummary() {
    this.financeService.getSummary(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response?.data) {
          const d = response.data;
          this.totalRevenue = d.totalRevenue || 0;
          this.totalExpenses = d.totalExpenses || 0;
          this.profit = d.profit || 0;
          this.profitMargin = d.profitMargin || 0;
          this.updateCards(d);
          this.revenueExpenseData.datasets[0].data = [this.totalRevenue, this.totalExpenses, this.profit];
          setTimeout(() => this.initializeCharts(), 100);
        }
        this.isLoading = false;
      },
      error: () => { this.errorMessage = 'حدث خطأ في تحميل البيانات المالية'; this.isLoading = false; this.cards.forEach(c => c.loading = false); }
    });
  }

  loadFinancialRecords() {
    this.financeService.getRecords(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.transactions = response.data.slice(0, 10).map((r: any) => ({
            id: r.id, title: r.description || r.category,
            date: this.getRelativeTime(r.date), amount: parseFloat(r.amount),
            type: r.type, category: r.category, description: r.description
          }));
          this.processChartData(response.data);
        }
      },
      error: () => {}
    });
  }

  updateCards(data: any) {
    this.cards[0].value = this.formatCurrency(data.totalRevenue || 0); this.cards[0].loading = false;
    this.cards[1].value = this.formatCurrency(data.totalExpenses || 0); this.cards[1].loading = false;
    this.cards[2].value = this.formatCurrency(data.profit || 0); this.cards[2].loading = false;
    this.cards[3].value = `${(data.profitMargin || 0).toFixed(1)}%`; this.cards[3].loading = false;
  }

  processChartData(records: any[]) {
    const expByCategory = this.groupByCategory(records.filter((r: any) => r.type === 'expense'));
    this.expenseDistributionData.labels = Object.keys(expByCategory);
    this.expenseDistributionData.datasets[0].data = Object.values(expByCategory);
    const monthly = this.getMonthlyData(records);
    this.monthlyTrendData.labels = monthly.months;
    this.monthlyTrendData.datasets[0].data = monthly.revenue;
    this.monthlyTrendData.datasets[1].data = monthly.expenses;
    this.updateCharts();
  }

  groupByCategory(records: any[]): { [key: string]: number } {
    return records.reduce((acc, r) => {
      const cat = r.category || 'أخرى';
      acc[cat] = (acc[cat] || 0) + parseFloat(r.amount);
      return acc;
    }, {});
  }

  getMonthlyData(records: any[]) {
    const md: { [k: string]: { revenue: number; expenses: number } } = {};
    records.forEach(r => {
      const d = new Date(r.date);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!md[k]) md[k] = { revenue:0, expenses:0 };
      if (r.type === 'revenue') md[k].revenue += parseFloat(r.amount);
      else if (r.type === 'expense') md[k].expenses += parseFloat(r.amount);
    });
    const sorted = Object.keys(md).sort();
    return { months: sorted.map(m => this.formatMonthLabel(m)), revenue: sorted.map(m => md[m].revenue), expenses: sorted.map(m => md[m].expenses) };
  }

  formatMonthLabel(key: string) {
    const months = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return months[parseInt(key.split('-')[1]) - 1];
  }

  initializeCharts() {
    this.destroyCharts();
    if (this.revenueExpenseChartCanvas) {
      const ctx = this.revenueExpenseChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.revenueExpenseChart = new Chart(ctx, { type:'bar', data:this.revenueExpenseData, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false}, tooltip:{callbacks:{label:(c)=>`${(c.parsed.y??0).toLocaleString('ar-SA')} ر.س`}}}, scales:{y:{beginAtZero:true, ticks:{callback:(v)=>`${(typeof v==='number'?v:0).toLocaleString('ar-SA')} ر.س`}}}}});
    }
    if (this.expenseDistributionChartCanvas) {
      const ctx = this.expenseDistributionChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.expenseDistributionChart = new Chart(ctx, { type:'doughnut', data:this.expenseDistributionData, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}, tooltip:{callbacks:{label:(c)=>`${c.label}: ${(typeof c.parsed==='number'?c.parsed:0).toLocaleString('ar-SA')} ر.س`}}}}});
    }
    if (this.monthlyTrendChartCanvas) {
      const ctx = this.monthlyTrendChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.monthlyTrendChart = new Chart(ctx, { type:'line', data:this.monthlyTrendData, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top'}, tooltip:{callbacks:{label:(c)=>`${c.dataset.label}: ${(c.parsed.y??0).toLocaleString('ar-SA')} ر.س`}}}, scales:{y:{beginAtZero:true, ticks:{callback:(v)=>`${(typeof v==='number'?v:0).toLocaleString('ar-SA')} ر.س`}}}}});
    }
    if (this.profitMarginChartCanvas) {
      const ctx = this.profitMarginChartCanvas.nativeElement.getContext('2d');
      if (ctx) this.profitMarginChart = new Chart(ctx, { type:'line', data:{ labels:this.monthlyTrendData.labels, datasets:[{ label:'هامش الربح %', data:this.calculateProfitMargins(), borderColor:'rgb(153,102,255)', backgroundColor:'rgba(153,102,255,.2)', tension:0.4, fill:true }]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c)=>`${(c.parsed.y??0).toFixed(1)}%`}}}, scales:{y:{beginAtZero:true, ticks:{callback:(v)=>`${v}%`}}}}});
    }
  }

  calculateProfitMargins() {
    const rev = this.monthlyTrendData.datasets[0].data as number[];
    const exp = this.monthlyTrendData.datasets[1].data as number[];
    return rev.map((r, i) => r > 0 ? ((r - exp[i]) / r) * 100 : 0);
  }

  updateCharts() {
    if (this.expenseDistributionChart) { this.expenseDistributionChart.data = this.expenseDistributionData; this.expenseDistributionChart.update(); }
    if (this.monthlyTrendChart) { this.monthlyTrendChart.data = this.monthlyTrendData; this.monthlyTrendChart.update(); }
    if (this.profitMarginChart) { this.profitMarginChart.data.datasets[0].data = this.calculateProfitMargins(); this.profitMarginChart.update(); }
  }

  destroyCharts() {
    [this.revenueExpenseChart, this.expenseDistributionChart, this.monthlyTrendChart, this.profitMarginChart].forEach(c => { if (c) c.destroy(); });
    this.revenueExpenseChart = this.expenseDistributionChart = this.monthlyTrendChart = this.profitMarginChart = null;
  }

  changePeriod(period: 'week' | 'month' | 'quarter' | 'year') {
    this.selectedPeriod = period;
    const now = new Date();
    this.endDate = now.toISOString().split('T')[0];
    const days = { week:7, month:30, quarter:90, year:365 };
    const ago = new Date(now.getTime() - days[period] * 24 * 60 * 60 * 1000);
    this.startDate = ago.toISOString().split('T')[0];
    this.loadFinancialData();
  }

  refreshFinancialData() { this.loadFinancialData(); }

  formatCurrency(amount: number) {
    return `${amount.toLocaleString('ar-SA', { minimumFractionDigits:0, maximumFractionDigits:0 })} ر.س`;
  }

  formatPercent(value: number) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  getRelativeTime(dateString: string) {
    if (!dateString) return 'اليوم';
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'أمس';
    if (diff < 7) return `منذ ${diff} أيام`;
    if (diff < 30) return `منذ ${Math.floor(diff/7)} أسابيع`;
    return `منذ ${Math.floor(diff/30)} أشهر`;
  }

  onSidebarToggle(collapsed: boolean) { this.isSidebarCollapsed = collapsed; }
  openSidebar() { this.sidebarComponent?.openMobile(); }
  openGuide() { this.showGuide = true; }
  closeGuide() { this.showGuide = false; }

  // ===== REPORT MODAL =====
  openReportModal() { this.showReportModal = true; }
  closeReportModal() { this.showReportModal = false; }

  exportReport() {
    this.isExporting = true;

    const lines: string[] = [];
    const now = new Date().toLocaleDateString('ar-SA');
    const periodLabels: Record<string, string> = { week: 'أسبوع', month: 'شهر', quarter: 'ربع سنة', year: 'سنة كاملة' };

    lines.push('تقرير مالي - خطوة');
    lines.push('التاريخ: ' + now);
    lines.push('الفترة: ' + periodLabels[this.reportPeriod]);
    lines.push('');
    lines.push('===== الملخص المالي =====');
    lines.push('إجمالي الإيرادات: ' + this.formatCurrency(this.totalRevenue));
    lines.push('إجمالي المصروفات: ' + this.formatCurrency(this.totalExpenses));
    lines.push('صافي الربح: ' + this.formatCurrency(this.profit));
    lines.push('هامش الربح: ' + this.profitMargin + '%');

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
      this.isExporting = false;
      this.closeReportModal();
      this.successMessage = '✅ تم تصدير التقرير بنجاح';
      setTimeout(() => this.successMessage = '', 3000);
    }, 1200);
  }

  // ===== ANALYTICS MODAL =====
  openAnalyticsModal() {
    this.buildAnalyticsData();
    this.showAnalyticsModal = true;
  }
  closeAnalyticsModal() { this.showAnalyticsModal = false; }

  buildAnalyticsData() {
    // expenses by category
    const expMap: Record<string, number> = {};
    const revMap: Record<string, number> = {};
    this.transactions.forEach(tx => {
      const cat = tx.category || 'أخرى';
      if (tx.type === 'expense') expMap[cat] = (expMap[cat] || 0) + Math.abs(tx.amount);
      if (tx.type === 'revenue') revMap[cat] = (revMap[cat] || 0) + tx.amount;
    });

    const expColors = ['red', 'blue', 'purple', 'orange', 'green'];
    const sortedExp = Object.entries(expMap).sort((a, b) => b[1] - a[1]);
    const maxExp = sortedExp[0]?.[1] || 1;
    this.expensesByCategory = sortedExp.map(([name, amount], i) => ({
      name, amount, pct: Math.round((amount / maxExp) * 100), color: expColors[i % expColors.length]
    }));

    const sortedRev = Object.entries(revMap).sort((a, b) => b[1] - a[1]);
    const maxRev = sortedRev[0]?.[1] || 1;
    this.revenuesByCategory = sortedRev.map(([name, amount]) => ({
      name, amount, pct: Math.round((amount / maxRev) * 100)
    }));

    // insights
    this.insights = [];
    if (this.profitMargin >= 40) {
      this.insights.push({ type: 'good', icon: '🎉', text: `هامش الربح <strong>${this.profitMargin}%</strong> ممتاز — أنت تُدير مشروعك بكفاءة عالية.` });
    } else if (this.profitMargin >= 20) {
      this.insights.push({ type: 'info', icon: '📈', text: `هامش الربح <strong>${this.profitMargin}%</strong> جيد — يمكن تحسينه بتقليل المصروفات التشغيلية.` });
    } else {
      this.insights.push({ type: 'warn', icon: '⚠️', text: `هامش الربح <strong>${this.profitMargin}%</strong> منخفض — راجع بنود المصروفات لتحسين الربحية.` });
    }

    const topExp = sortedExp[0];
    if (topExp) {
      const pct = this.totalExpenses > 0 ? Math.round((topExp[1] / this.totalExpenses) * 100) : 0;
      this.insights.push({ type: 'info', icon: '💡', text: `أكبر بند مصروفات هو <strong>${topExp[0]}</strong> بنسبة <strong>${pct}%</strong> من إجمالي المصروفات.` });
    }

    const topRev = sortedRev[0];
    if (topRev) {
      const pct = this.totalRevenue > 0 ? Math.round((topRev[1] / this.totalRevenue) * 100) : 0;
      this.insights.push({ type: 'good', icon: '🌟', text: `أكبر مصدر إيراد هو <strong>${topRev[0]}</strong> بنسبة <strong>${pct}%</strong> من إجمالي الإيرادات.` });
    }

    if (this.totalRevenue > this.totalExpenses * 1.5) {
      this.insights.push({ type: 'good', icon: '🚀', text: 'إيراداتك تتجاوز مصروفاتك بنسبة كبيرة — المشروع في وضع مالي قوي.' });
    }
  }

  getAvgTransaction(): string {
    if (!this.transactions.length) return '0 ر.س';
    const total = this.transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
    return this.formatCurrency(Math.round(total / this.transactions.length));
  }

}