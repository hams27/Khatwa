import { Component } from '@angular/core';
import { SideBar } from '../side-bar/side-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-financial-overview',
  imports: [SideBar,CommonModule],
  templateUrl: './financial-overview.html',
  styleUrl: './financial-overview.css',
})
export class FinancialOverview {
showGuide = false;
openGuide() {
  this.showGuide = true;
}

closeGuide() {
  this.showGuide = false;
}

  cards = [
    { title: 'إجمالي الإيرادات', value: '32,000 ر.س', percent: '+12.5%', up: true },
    { title: 'إجمالي المصروفات', value: '14,000 ر.س', percent: '-5.2%', up: false },
    { title: 'صافي الربح', value: '18,000 ر.س', percent: '+23.8%', up: true },
  ];

  transactions = [
    { title: 'دفعة من عميل أحمد', date: 'اليوم', amount: 5000, type: 'in' },
    { title: 'إعلانات سوشيال ميديا', date: 'أمس', amount: -1200, type: 'out' },
    { title: 'مبيعات المتجر الإلكتروني', date: 'أمس', amount: 3500, type: 'in' },
    { title: 'اشتراك برامج', date: 'منذ يومين', amount: -450, type: 'out' },
    { title: 'فاتورة كهرباء', date: 'منذ 3 أيام', amount: -800, type: 'pending' }
  ];



}
