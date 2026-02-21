import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ProjectService, Project } from '../services/project';
import { FinanceService } from '../services/finance';
import { HttpErrorResponse } from '@angular/common/http';

Chart.register(...registerables);

// Interfaces
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

@Component({
  selector: 'app-financial-overview',
  imports: [SideBar, CommonModule, FormsModule],
  templateUrl: './financial-overview.html',
  styleUrl: './financial-overview.css',
  standalone: true
})
export class FinancialOverview implements OnInit, AfterViewInit, OnDestroy {
  
  // ── Sidebar Reference ──
  @ViewChild('sidebarRef') sidebarComponent?: SideBar;

  // Chart References
  @ViewChild('revenueExpenseChart') revenueExpenseChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('expenseDistributionChart') expenseDistributionChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyTrendChart') monthlyTrendChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('profitMarginChart') profitMarginChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Chart Instances
  private revenueExpenseChart: any = null;
  private expenseDistributionChart: any = null;
  private monthlyTrendChart: any = null;
  private profitMarginChart: any = null;
  
  // Loading & Error States
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showGuide = false;
  isSidebarCollapsed = false;
  
  // Current Project
  currentProject: Project | null = null;
  currentProjectId: number = 0;
  
  // Financial Cards (Dynamic)
  cards: FinancialCard[] = [
    { title: 'إجمالي الإيرادات', value: '0 ر.س', percent: '+0%', up: true, loading: true },
    { title: 'إجمالي المصروفات', value: '0 ر.س', percent: '+0%', up: false, loading: true },
    { title: 'صافي الربح', value: '0 ر.س', percent: '+0%', up: true, loading: true },
    { title: 'هامش الربح', value: '0%', percent: '+0%', up: true, loading: true }
  ];
  
  // Transactions (Dynamic)
  transactions: Transaction[] = [];
  
  // Financial Data
  totalRevenue = 0;
  totalExpenses = 0;
  profit = 0;
  profitMargin = 0;
  
  // Period Selection
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year' = 'month';
  startDate: string = '';
  endDate: string = '';
  
  // Chart Data
  revenueExpenseData: ChartData = {
    labels: ['الإيرادات', 'المصروفات', 'الربح'],
    datasets: [{
      label: 'المبلغ (ر.س)',
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)'
      ],
      borderWidth: 2
    }]
  };
  
  expenseDistributionData: ChartData = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#FF6384',
        '#36A2EB',
        '#FFCE56',
        '#4BC0C0',
        '#9966FF',
        '#FF9F40'
      ]
    }]
  };
  
  monthlyTrendData: ChartData = {
    labels: [],
    datasets: [
      {
        label: 'الإيرادات',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'المصروفات',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  constructor(
    private projectService: ProjectService,
    private financeService: FinanceService
  ) { }

  ngOnInit(): void {
    console.log('💰 Financial Overview Component Initialized');
    this.initializeDates();
    this.loadMockData();
  }

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
      { id: 1,  title: 'عقد خدمات تصميم موقع',    date: 'اليوم',       amount:  18500, type: 'revenue',  category: 'خدمات رقمية' },
      { id: 2,  title: 'فاتورة إيجار المكتب',      date: 'أمس',         amount: -4500,  type: 'expense',  category: 'إيجار'       },
      { id: 3,  title: 'مشروع تطوير تطبيق',        date: 'منذ يومين',   amount:  32000, type: 'revenue',  category: 'تطوير'       },
      { id: 4,  title: 'رواتب الفريق - فبراير',    date: 'منذ 3 أيام',  amount: -22000, type: 'expense',  category: 'رواتب'       },
      { id: 5,  title: 'استشارة تسويقية',           date: 'منذ 4 أيام',  amount:  8200,  type: 'revenue',  category: 'استشارات'    },
      { id: 6,  title: 'اشتراك أدوات SaaS',        date: 'منذ 5 أيام',  amount: -1800,  type: 'expense',  category: 'تقنية'       },
      { id: 7,  title: 'مشروع هوية بصرية',         date: 'منذ أسبوع',   amount:  12000, type: 'revenue',  category: 'تصميم'       },
      { id: 8,  title: 'حملة إعلانية - جوجل',      date: 'منذ أسبوع',   amount: -5500,  type: 'expense',  category: 'تسويق'       },
      { id: 9,  title: 'دفعة مقدمة - عميل جديد',  date: 'منذ أسبوعين', amount:  15000, type: 'revenue',  category: 'عقود'        },
      { id: 10, title: 'فاتورة خدمات سحابية',      date: 'منذ أسبوعين', amount: -2800,  type: 'expense',  category: 'تقنية'       },
    ];

    this.revenueExpenseData = {
      labels: ['الإيرادات', 'المصروفات', 'صافي الربح'],
      datasets: [{
        label: 'المبلغ (ر.س)',
        data: [128500, 74300, 54200],
        backgroundColor: ['rgba(31,153,80,0.75)', 'rgba(229,57,53,0.75)', 'rgba(30,136,229,0.75)'],
        borderColor: ['#1f9950', '#e53935', '#1e88e5'],
        borderWidth: 2,
        borderRadius: 8,
      }]
    };

    this.expenseDistributionData = {
      labels: ['رواتب', 'إيجار', 'تسويق', 'تقنية', 'متفرقات'],
      datasets: [{
        data: [22000, 4500, 5500, 4600, 4700],
        backgroundColor: ['#1f9950', '#00e676', '#1e88e5', '#7c4dff', '#ffa726'],
        borderWidth: 0,
      }]
    };

    this.monthlyTrendData = {
      labels: ['سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير'],
      datasets: [
        {
          label: 'الإيرادات',
          data: [68000, 75000, 82000, 91000, 110000, 128500],
          borderColor: '#1f9950',
          backgroundColor: 'rgba(31,153,80,0.12)',
          tension: 0.4, fill: true, pointRadius: 4,
        },
        {
          label: 'المصروفات',
          data: [52000, 58000, 61000, 66000, 70000, 74300],
          borderColor: '#e53935',
          backgroundColor: 'rgba(229,57,53,0.08)',
          tension: 0.4, fill: true, pointRadius: 4,
        }
      ]
    };

    setTimeout(() => this.initializeCharts(), 150);
  }
  
  ngAfterViewInit(): void {
    // Charts will be initialized after data is loaded
  }
  
  ngOnDestroy(): void {
    this.destroyCharts();
  }

  // Initialize Dates
  initializeDates() {
    const now = new Date();
    this.endDate = now.toISOString().split('T')[0];
    
    // Default to last 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.startDate = thirtyDaysAgo.toISOString().split('T')[0];
  }

  // Load Current Project
  loadCurrentProject() {
    this.isLoading = true;
    
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        console.log('📦 Projects loaded:', response);
        
        if (response && response.data && response.data.length > 0) {
          this.currentProject = response.data[0];
          this.currentProjectId = this.currentProject!.id!;
          
          // Load financial data
          this.loadFinancialData();
        } else {
          this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
          this.isLoading = false;
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading projects:', error);
        this.errorMessage = 'حدث خطأ في تحميل المشاريع';
        this.isLoading = false;
      }
    });
  }

  // Load Financial Data
  loadFinancialData() {
    console.log('💵 Loading financial data...');
    
    // Load summary
    this.loadFinancialSummary();
    
    // Load records
    this.loadFinancialRecords();
  }

  // Load Financial Summary
  loadFinancialSummary() {
    this.financeService.getSummary(this.currentProjectId).subscribe({
      next: (response: any) => {
        console.log('📊 Financial summary loaded:', response);
        
        if (response && response.data) {
          const data = response.data;
          
          this.totalRevenue = data.totalRevenue || 0;
          this.totalExpenses = data.totalExpenses || 0;
          this.profit = data.profit || 0;
          this.profitMargin = data.profitMargin || 0;
          
          // Update cards
          this.updateCards(data);
          
          // Update revenue/expense chart
          this.revenueExpenseData.datasets[0].data = [
            this.totalRevenue,
            this.totalExpenses,
            this.profit
          ];
          
          // Initialize charts if canvas is ready
          setTimeout(() => {
            this.initializeCharts();
          }, 100);
        }
        
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading summary:', error);
        this.errorMessage = 'حدث خطأ في تحميل البيانات المالية';
        this.isLoading = false;
        this.cards.forEach(card => card.loading = false);
      }
    });
  }

  // Load Financial Records
  loadFinancialRecords() {
    this.financeService.getRecords(this.currentProjectId).subscribe({
      next: (response: any) => {
        console.log('📝 Financial records loaded:', response);
        
        if (response && response.data) {
          const records = response.data;
          
          // Convert to transactions
          this.transactions = records.slice(0, 10).map((record: any) => ({
            id: record.id,
            title: record.description || record.category,
            date: this.getRelativeTime(record.date),
            amount: parseFloat(record.amount),
            type: record.type,
            category: record.category,
            description: record.description
          }));
          
          // Process data for charts
          this.processChartData(records);
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading records:', error);
      }
    });
  }

  // Update Cards
  updateCards(data: any) {
    // Revenue card
    this.cards[0].value = this.formatCurrency(data.totalRevenue || 0);
    this.cards[0].loading = false;
    if (data.previousRevenue) {
      const change = ((data.totalRevenue - data.previousRevenue) / data.previousRevenue * 100);
      this.cards[0].percent = this.formatPercent(change);
      this.cards[0].up = change >= 0;
    }
    
    // Expenses card
    this.cards[1].value = this.formatCurrency(data.totalExpenses || 0);
    this.cards[1].loading = false;
    if (data.previousExpenses) {
      const change = ((data.totalExpenses - data.previousExpenses) / data.previousExpenses * 100);
      this.cards[1].percent = this.formatPercent(change);
      this.cards[1].up = change <= 0; // Lower expenses is good
    }
    
    // Profit card
    this.cards[2].value = this.formatCurrency(data.profit || 0);
    this.cards[2].loading = false;
    if (data.previousProfit !== undefined) {
      const change = data.previousProfit !== 0 
        ? ((data.profit - data.previousProfit) / Math.abs(data.previousProfit) * 100)
        : (data.profit > 0 ? 100 : 0);
      this.cards[2].percent = this.formatPercent(change);
      this.cards[2].up = change >= 0;
    }
    
    // Profit Margin card
    this.cards[3].value = `${(data.profitMargin || 0).toFixed(1)}%`;
    this.cards[3].loading = false;
    if (data.previousProfitMargin !== undefined) {
      const change = data.profitMargin - data.previousProfitMargin;
      this.cards[3].percent = this.formatPercent(change);
      this.cards[3].up = change >= 0;
    }
  }

  // Process Chart Data
  processChartData(records: any[]) {
    // Expense Distribution (by category)
    const expensesByCategory = this.groupByCategory(records.filter((r: any) => r.type === 'expense'));
    this.expenseDistributionData.labels = Object.keys(expensesByCategory);
    this.expenseDistributionData.datasets[0].data = Object.values(expensesByCategory);
    
    // Monthly Trend
    const monthlyData = this.getMonthlyData(records);
    this.monthlyTrendData.labels = monthlyData.months;
    this.monthlyTrendData.datasets[0].data = monthlyData.revenue;
    this.monthlyTrendData.datasets[1].data = monthlyData.expenses;
    
    // Update charts
    this.updateCharts();
  }

  // Group by Category
  groupByCategory(records: any[]): { [key: string]: number } {
    return records.reduce((acc, record) => {
      const category = record.category || 'أخرى';
      acc[category] = (acc[category] || 0) + parseFloat(record.amount);
      return acc;
    }, {});
  }

  // Get Monthly Data
  getMonthlyData(records: any[]): { months: string[], revenue: number[], expenses: number[] } {
    const monthlyData: { [key: string]: { revenue: number, expenses: number } } = {};
    
    records.forEach(record => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, expenses: 0 };
      }
      
      if (record.type === 'revenue') {
        monthlyData[monthKey].revenue += parseFloat(record.amount);
      } else if (record.type === 'expense') {
        monthlyData[monthKey].expenses += parseFloat(record.amount);
      }
    });
    
    // Convert to arrays and sort by date
    const sortedMonths = Object.keys(monthlyData).sort();
    
    return {
      months: sortedMonths.map(m => this.formatMonthLabel(m)),
      revenue: sortedMonths.map(m => monthlyData[m].revenue),
      expenses: sortedMonths.map(m => monthlyData[m].expenses)
    };
  }

  // Format Month Label
  formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const monthNames = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return monthNames[parseInt(month) - 1];
  }

  // Initialize Charts
  initializeCharts() {
    this.destroyCharts(); // Destroy old charts first
    
    // Revenue vs Expense Chart (Bar)
    if (this.revenueExpenseChartCanvas) {
      const ctx1 = this.revenueExpenseChartCanvas.nativeElement.getContext('2d');
      if (ctx1) {
        this.revenueExpenseChart = new Chart(ctx1, {
          type: 'bar',
          data: this.revenueExpenseData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed.y ?? 0;
                    return `${value.toLocaleString('ar-SA')} ر.س`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => {
                    const num = typeof value === 'number' ? value : 0;
                    return `${num.toLocaleString('ar-SA')} ر.س`;
                  }
                }
              }
            }
          }
        });
      }
    }
    
    // Expense Distribution Chart (Pie/Doughnut)
    if (this.expenseDistributionChartCanvas) {
      const ctx2 = this.expenseDistributionChartCanvas.nativeElement.getContext('2d');
      if (ctx2) {
        this.expenseDistributionChart = new Chart(ctx2, {
          type: 'doughnut',
          data: this.expenseDistributionData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const label = context.label || '';
                    const value = typeof context.parsed === 'number' ? context.parsed : 0;
                    return `${label}: ${value.toLocaleString('ar-SA')} ر.س`;
                  }
                }
              }
            }
          }
        });
      }
    }
    
    // Monthly Trend Chart (Line)
    if (this.monthlyTrendChartCanvas) {
      const ctx3 = this.monthlyTrendChartCanvas.nativeElement.getContext('2d');
      if (ctx3) {
        this.monthlyTrendChart = new Chart(ctx3, {
          type: 'line',
          data: this.monthlyTrendData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top' },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed.y ?? 0;
                    return `${context.dataset.label}: ${value.toLocaleString('ar-SA')} ر.س`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => {
                    const num = typeof value === 'number' ? value : 0;
                    return `${num.toLocaleString('ar-SA')} ر.س`;
                  }
                }
              }
            }
          }
        });
      }
    }
    
    // Profit Margin Chart (Line)
    if (this.profitMarginChartCanvas) {
      const ctx4 = this.profitMarginChartCanvas.nativeElement.getContext('2d');
      if (ctx4) {
        this.profitMarginChart = new Chart(ctx4, {
          type: 'line',
          data: {
            labels: this.monthlyTrendData.labels,
            datasets: [{
              label: 'هامش الربح %',
              data: this.calculateProfitMargins(),
              borderColor: 'rgb(153, 102, 255)',
              backgroundColor: 'rgba(153, 102, 255, 0.2)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    const value = context.parsed.y ?? 0;
                    return `${value.toFixed(1)}%`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => {
                    const num = typeof value === 'number' ? value : 0;
                    return `${num}%`;
                  }
                }
              }
            }
          }
        });
      }
    }
  }

  // Calculate Profit Margins
  calculateProfitMargins(): number[] {
    const revenueData = this.monthlyTrendData.datasets[0].data as number[];
    const expensesData = this.monthlyTrendData.datasets[1].data as number[];
    
    return revenueData.map((revenue, index) => {
      const expenses = expensesData[index];
      const profit = revenue - expenses;
      return revenue > 0 ? (profit / revenue) * 100 : 0;
    });
  }

  // Update Charts
  updateCharts() {
    if (this.expenseDistributionChart) {
      this.expenseDistributionChart.data = this.expenseDistributionData;
      this.expenseDistributionChart.update();
    }
    
    if (this.monthlyTrendChart) {
      this.monthlyTrendChart.data = this.monthlyTrendData;
      this.monthlyTrendChart.update();
    }
    
    if (this.profitMarginChart) {
      this.profitMarginChart.data.datasets[0].data = this.calculateProfitMargins();
      this.profitMarginChart.update();
    }
  }

  // Destroy Charts
  destroyCharts() {
    if (this.revenueExpenseChart) {
      this.revenueExpenseChart.destroy();
      this.revenueExpenseChart = null;
    }
    if (this.expenseDistributionChart) {
      this.expenseDistributionChart.destroy();
      this.expenseDistributionChart = null;
    }
    if (this.monthlyTrendChart) {
      this.monthlyTrendChart.destroy();
      this.monthlyTrendChart = null;
    }
    if (this.profitMarginChart) {
      this.profitMarginChart.destroy();
      this.profitMarginChart = null;
    }
  }

  // Change Period
  changePeriod(period: 'week' | 'month' | 'quarter' | 'year') {
    this.selectedPeriod = period;
    
    const now = new Date();
    this.endDate = now.toISOString().split('T')[0];
    
    switch (period) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        this.startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        this.startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        this.startDate = quarterAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        this.startDate = yearAgo.toISOString().split('T')[0];
        break;
    }
    
    this.loadFinancialData();
  }

  // Refresh Data
  refreshFinancialData() {
    this.loadFinancialData();
  }

  // Utility Functions
  
  formatCurrency(amount: number): string {
    return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ر.س`;
  }
  
  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }
  
  getRelativeTime(dateString: string): string {
    if (!dateString) return 'اليوم';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'اليوم';
    if (diffInDays === 1) return 'أمس';
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
    if (diffInDays < 30) return `منذ ${Math.floor(diffInDays / 7)} أسابيع`;
    return `منذ ${Math.floor(diffInDays / 30)} أشهر`;
  }

  // Guide functions
  onSidebarToggle(collapsed: boolean) {
    this.isSidebarCollapsed = collapsed;
  }

  /** يفتح الـ sidebar على موبايل/تابلت */
  openSidebar() {
    this.sidebarComponent?.openMobile();
  }

  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }
}