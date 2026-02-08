import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, SideBar],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.css'], // صححت typo: styleUrl -> styleUrls
})
export class Analytics {
  // حالة عرض دليل الاستخدام
  showGuide = false;

  // فتح دليل الاستخدام
  openGuide() {
    this.showGuide = true;
  }

  // غلق دليل الاستخدام
  closeGuide() {
    this.showGuide = false;
  }

  // Stats Cards ديناميكية
  statsCards = [
    {
      title: 'إجمالي الزوار',
      value: '2,800',
      change: '+16.7%',
      icon: '👁',
      color: 'blue',
    },
    {
      title: 'معدل التحويل',
      value: '45.7%',
      change: '+8.2%',
      icon: '🎯',
      color: 'green',
    },
    {
      title: 'المبيعات',
      value: '1,280',
      change: '+21.9%',
      icon: '🛒',
      color: 'purple',
    },
    {
      title: 'التفاعل',
      value: '92%',
      change: '+4.5%',
      icon: '👤',
      color: 'orange',
    },
  ];

  // Insights ديناميكية
  insights = [
    {
      title: 'التوقع الإيجابي',
      description:
        'إذا استمر هذا الأداء، ستصل إلى 50,000 ر.س إيرادات شهرية خلال 4 أشهر',
      confidence: 85,
      type: 'success',
    },
    {
      title: 'فرصة نمو',
      description:
        'زيادة الاستثمار في التسويق بنسبة 20% قد تضاعف عدد العملاء الجدد',
      confidence: 78,
      type: 'info',
    },
    {
      title: 'تنبيه',
      description:
        'معدل التحويل قد ينخفض إذا لم يتم تحسين تجربة المستخدم على الموقع',
      confidence: 72,
      type: 'warning',
    },
  ];

  // Channels data (لرسم الشارت لاحقًا)
  channels = [
    { name: 'وسائل التواصل', visitors: 1200, conversion: 32 },
    { name: 'البريد الإلكتروني', visitors: 850, conversion: 41 },
    { name: 'محركات البحث', visitors: 600, conversion: 29 },
    { name: 'إعلانات مدفوعة', visitors: 220, conversion: 18 },
  ];
}
