import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';
import { ProjectService, Project } from '../services/project';
import { FinanceService } from '../services/finance';
import { TaskService } from '../services/task';
import { MarketingService } from '../services/marketing';
import { interval, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Interfaces
interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: string;
  color: string;
  loading?: boolean;
}

interface Insight {
  title: string;
  description: string;
  confidence: number;
  type: 'success' | 'info' | 'warning' | 'danger';
}

interface ChannelData {
  name: string;
  visitors: number;
  conversion: number;
  revenue?: number;
}

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, FormsModule, SideBar],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css'],
  standalone: true
})
export class Analytics implements OnInit, OnDestroy, AfterViewInit {
  
  // Chart References
  @ViewChild('performanceChart') performanceChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueProjectionChart') revenueProjectionChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('taskCompletionChart') taskCompletionChart?: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthTrendChart') growthTrendChart?: ElementRef<HTMLCanvasElement>;
  
  // Chart Instances
  private performanceChartInstance?: Chart;
  private revenueProjectionChartInstance?: Chart;
  private taskCompletionChartInstance?: Chart;
  private growthTrendChartInstance?: Chart;
  
  // Loading & Error States
  isLoading = false;
  errorMessage = '';
  showGuide = false;
  chartsLoading = true;
  
  // Project Info
  currentProject: Project | null = null;
  currentProjectId: number = 0;
  
  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  autoRefreshEnabled = false;
  
  // Stats Cards
  statsCards: StatCard[] = [
    {
      title: 'إجمالي الإيرادات',
      value: '0 ر.س',
      change: '+0%',
      icon: '💰',
      color: 'blue',
      loading: true
    },
    {
      title: 'معدل إنجاز المهام',
      value: '0%',
      change: '+0%',
      icon: '🎯',
      color: 'green',
      loading: true
    },
    {
      title: 'المصروفات الشهرية',
      value: '0 ر.س',
      change: '+0%',
      icon: '📊',
      color: 'purple',
      loading: true
    },
    {
      title: 'معدل النمو',
      value: '0%',
      change: '+0%',
      icon: '📈',
      color: 'orange',
      loading: true
    }
  ];
  
  // Insights
  insights: Insight[] = [];
  
  // Chart Data
  performanceData = {
    months: ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو'],
    revenue: [15000, 22000, 18000, 28000, 25000, 32000],
    tasks: [65, 72, 68, 78, 75, 82],
    satisfaction: [70, 75, 73, 80, 78, 85]
  };
  
  revenueProjectionData = {
    historical: [15000, 22000, 18000, 28000, 25000, 32000],
    projected: [35000, 38000, 42000, 45000, 48000, 52000]
  };
  
  taskCompletionData = {
    weeks: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'],
    planned: [20, 25, 22, 28],
    completed: [18, 23, 20, 25]
  };
  
  growthMetrics = {
    quarters: ['Q1', 'Q2', 'Q3', 'Q4'],
    revenue: [45000, 68000, 82000, 105000],
    customers: [120, 185, 245, 320],
    marketShare: [12, 15, 18, 22]
  };

  constructor(
    private projectService: ProjectService,
    private financeService: FinanceService,
    private taskService: TaskService,
    private marketingService: MarketingService
  ) {}

  ngOnInit() {
    console.log('📊 Analytics Component Initialized');
    this.loadCurrentProject();
  }
  
  ngAfterViewInit() {
    // Charts will be created after data loads
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    this.destroyCharts();
  }

  loadCurrentProject() {
    this.isLoading = true;
    
    this.projectService.getProjects().subscribe({
      next: (response: any) => {
        console.log('📦 Projects loaded:', response);
        
        if (response && response.data && response.data.length > 0) {
          this.currentProject = response.data[0];
          this.currentProjectId = this.currentProject!.id!;
          
          this.loadAnalyticsData();
        } else {
          this.errorMessage = 'لا توجد مشاريع. قم بإنشاء مشروعك الأول!';
          this.isLoading = false;
          this.chartsLoading = false;
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Error loading projects:', error);
        this.errorMessage = 'حدث خطأ في تحميل المشاريع';
        this.isLoading = false;
        this.chartsLoading = false;
      }
    });
  }

  loadAnalyticsData() {
    console.log('📊 Loading analytics data...');
    
    // Load Financial Data
    this.financeService.getSummary(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.updateFinancialStats(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading finance:', error);
      }
    });
    
    // Load Tasks Data
    this.taskService.getTasks(this.currentProjectId).subscribe({
      next: (response: any) => {
        if (response && response.data) {
          this.updateTaskStats(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
      }
    });
    
    // Generate insights
    this.generateInsights();
    
    this.isLoading = false;
    this.chartsLoading = false;
    
    // Create charts
    setTimeout(() => {
      this.createAllCharts();
    }, 100);
  }

  updateFinancialStats(data: any) {
    const revenue = data.totalRevenue || 0;
    const expenses = data.totalExpenses || 0;
    
    this.statsCards[0].value = `${revenue.toLocaleString('ar-SA')} ر.س`;
    this.statsCards[0].change = '+15%'; // Mock data
    this.statsCards[0].loading = false;
    
    this.statsCards[2].value = `${expenses.toLocaleString('ar-SA')} ر.س`;
    this.statsCards[2].change = '+8%'; // Mock data
    this.statsCards[2].loading = false;
    
    // Growth rate
    const growth = revenue > 0 ? ((revenue - expenses) / revenue * 100) : 0;
    this.statsCards[3].value = `${growth.toFixed(1)}%`;
    this.statsCards[3].change = '+12%';
    this.statsCards[3].loading = false;
  }

  updateTaskStats(tasks: any[]) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const rate = total > 0 ? (completed / total * 100) : 0;
    
    this.statsCards[1].value = `${rate.toFixed(1)}%`;
    this.statsCards[1].change = '+5%'; // Mock data
    this.statsCards[1].loading = false;
  }

  generateInsights() {
    this.insights = [
      {
        title: 'اتجاه إيجابي للإيرادات',
        description: 'الإيرادات في نمو مستمر مع زيادة 15% مقارنة بالشهر الماضي',
        confidence: 85,
        type: 'success'
      },
      {
        title: 'معدل إنجاز المهام جيد',
        description: 'الفريق يحافظ على أداء ثابت مع معدل إنجاز 78%',
        confidence: 75,
        type: 'info'
      },
      {
        title: 'فرصة لتحسين الكفاءة',
        description: 'يمكن تقليل المصروفات التشغيلية بنسبة 10% من خلال الأتمتة',
        confidence: 70,
        type: 'warning'
      },
      {
        title: 'توقعات نمو واعدة',
        description: 'بناءً على الاتجاه الحالي، متوقع نمو 25% في الربع القادم',
        confidence: 80,
        type: 'success'
      }
    ];
  }

  // ==================== CHARTS ====================
  
  createAllCharts() {
    this.createPerformanceChart();
    this.createRevenueProjectionChart();
    this.createTaskCompletionChart();
    this.createGrowthTrendChart();
  }
  
  createPerformanceChart() {
    if (!this.performanceChart) return;
    
    const ctx = this.performanceChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.performanceChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.performanceData.months,
        datasets: [
          {
            label: 'الإيرادات (ر.س)',
            data: this.performanceData.revenue,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'إنجاز المهام (%)',
            data: this.performanceData.tasks,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y1'
          },
          {
            label: 'رضا العملاء (%)',
            data: this.performanceData.satisfaction,
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
            position: 'left',
            title: {
              display: true,
              text: 'الإيرادات (ر.س)',
              font: { family: 'Cairo' }
            },
            ticks: {
              font: { family: 'Cairo' },
              callback: (value) => value.toLocaleString()
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'النسبة المئوية (%)',
              font: { family: 'Cairo' }
            },
            ticks: {
              font: { family: 'Cairo' }
            },
            grid: {
              drawOnChartArea: false
            },
            max: 100
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
  
  createRevenueProjectionChart() {
    if (!this.revenueProjectionChart) return;
    
    const ctx = this.revenueProjectionChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    this.revenueProjectionChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'الفعلي',
            data: [...this.revenueProjectionData.historical, ...Array(6).fill(null)],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            borderWidth: 2
          },
          {
            label: 'المتوقع',
            data: [...Array(6).fill(null), ...this.revenueProjectionData.projected],
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            borderDash: [5, 5],
            borderWidth: 2
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
            beginAtZero: true,
            ticks: {
              font: { family: 'Cairo' },
              callback: (value) => `${value.toLocaleString()} ر.س`
            }
          },
          x: {
            ticks: {
              font: { family: 'Cairo', size: 11 }
            }
          }
        }
      }
    });
  }
  
  createTaskCompletionChart() {
    if (!this.taskCompletionChart) return;
    
    const ctx = this.taskCompletionChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.taskCompletionChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.taskCompletionData.weeks,
        datasets: [
          {
            label: 'المخطط',
            data: this.taskCompletionData.planned,
            backgroundColor: 'rgba(156, 163, 175, 0.5)',
            borderColor: 'rgb(156, 163, 175)',
            borderWidth: 2,
            borderRadius: 6
          },
          {
            label: 'المكتمل',
            data: this.taskCompletionData.completed,
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 2,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            beginAtZero: true,
            ticks: {
              stepSize: 5,
              font: { family: 'Cairo' }
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
  
  createGrowthTrendChart() {
    if (!this.growthTrendChart) return;
    
    const ctx = this.growthTrendChart.nativeElement.getContext('2d');
    if (!ctx) return;
    
    this.growthTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.growthMetrics.quarters,
        datasets: [
          {
            label: 'الإيرادات (ر.س)',
            data: this.growthMetrics.revenue,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: 'العملاء',
            data: this.growthMetrics.customers,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y1'
          },
          {
            label: 'حصة السوق (%)',
            data: this.growthMetrics.marketShare,
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.4,
            fill: true,
            yAxisID: 'y2'
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
            position: 'left',
            title: {
              display: true,
              text: 'الإيرادات',
              font: { family: 'Cairo' }
            },
            ticks: {
              font: { family: 'Cairo' }
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'العملاء',
              font: { family: 'Cairo' }
            },
            ticks: {
              font: { family: 'Cairo' }
            },
            grid: {
              drawOnChartArea: false
            }
          },
          y2: {
            type: 'linear',
            display: false,
            max: 100
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
  
  destroyCharts() {
    if (this.performanceChartInstance) {
      this.performanceChartInstance.destroy();
    }
    if (this.revenueProjectionChartInstance) {
      this.revenueProjectionChartInstance.destroy();
    }
    if (this.taskCompletionChartInstance) {
      this.taskCompletionChartInstance.destroy();
    }
    if (this.growthTrendChartInstance) {
      this.growthTrendChartInstance.destroy();
    }
  }

  // ==================== UI ACTIONS ====================

  openGuide() {
    this.showGuide = true;
  }

  closeGuide() {
    this.showGuide = false;
  }

  toggleGuide() {
    this.showGuide = !this.showGuide;
  }

  refreshData() {
    this.loadAnalyticsData();
  }

  refreshAnalytics() {
    this.refreshData();
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      this.refreshSubscription = interval(30000).subscribe(() => {
        this.refreshData();
      });
    } else {
      if (this.refreshSubscription) {
        this.refreshSubscription.unsubscribe();
      }
    }
  }

  exportData(format: 'pdf' | 'excel') {
    console.log(`Exporting data as ${format}`);
    alert(`سيتم إضافة ميزة التصدير لـ ${format} قريباً`);
  }

  // ==================== UTILITY FUNCTIONS ====================

  getInsightIcon(type: string): string {
    const icons: { [key: string]: string } = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      danger: '❌'
    };
    return icons[type] || 'ℹ️';
  }

  getInsightClass(type: string): string {
    return `insight-${type}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}