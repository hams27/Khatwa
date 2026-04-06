import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  time: string;
  rating?: 'up' | 'down' | null;
}

export interface Conversation {
  id: number;
  title: string;
  date: string;
  messages?: ChatMessage[];
}

export interface WelcomeCard {
  icon: string;   // Bootstrap Icons name
  title: string;
  desc: string;
  prompt: string;
}

export interface Suggestion {
  icon: string;   // Bootstrap Icons name
  text: string;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, SideBar],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class Chat implements OnInit, AfterViewChecked, OnDestroy {

  // ── References ──
  @ViewChild('sidebarRef')     sidebarComponent?: SideBar;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput')   messageInput!: ElementRef;

  // ── حالة الصفحة ──
  isSidebarCollapsed = false;
  isTyping           = false;
  inputFocused       = false;
  toastMessage       = '';
  private shouldScroll = false;

  // ── المستخدم الحالي (من localStorage) ──
  userInitial = 'م';

  // ── المحادثة الحالية ──
  inputText    = '';
  messages: ChatMessage[] = [];
  activeConvId: number | null = null;
  private msgIdCounter = 1;

  // ── سجل المحادثات
  //    تُحمَّل عبر loadHistory() ← API: GET /api/v1/chat/history
  conversationHistory: Conversation[] = [];

  // ── بطاقات الترحيب — ثابتة في الواجهة
  welcomeCards: WelcomeCard[] = [
    { icon: 'graph-up-arrow',  title: 'تحليل الأداء',    desc: 'احصل على تقرير سريع عن أداء مشروعك',        prompt: 'حلّل أداء مشروعي وأعطني توصيات للتحسين' },
    { icon: 'lightbulb',       title: 'أفكار تسويقية',   desc: 'اقتراحات لتحسين استراتيجيتك التسويقية',     prompt: 'اقترح لي أفكاراً تسويقية مناسبة لمشروعي' },
    { icon: 'list-check',      title: 'إدارة المهام',     desc: 'نصائح لتنظيم مهامك وزيادة إنتاجيتك',        prompt: 'كيف أدير مهام فريقي بكفاءة أكبر؟' },
    { icon: 'currency-dollar', title: 'نصائح مالية',     desc: 'إرشادات لإدارة ميزانية مشروعك',              prompt: 'كيف أدير ميزانية مشروعي بشكل أفضل؟' },
  ];

  // ── اقتراحات الشريط الجانبي — ثابتة
  suggestions: Suggestion[] = [
    { icon: 'rocket-takeoff',   text: 'كيف أبدأ مشروعي؟' },
    { icon: 'people',           text: 'نصائح لبناء الفريق' },
    { icon: 'bar-chart-line',   text: 'كيف أزيد مبيعاتي؟' },
    { icon: 'shield-check',     text: 'كيف أحمي مشروعي؟' },
    { icon: 'wallet2',          text: 'طرق تمويل المشاريع' },
  ];

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadHistory();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {}

  // ─────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────

  onSidebarToggle(collapsed: boolean): void { this.isSidebarCollapsed = collapsed; }
  openSidebar(): void { this.sidebarComponent?.openMobile(); }

  // ─────────────────────────────────────────────
  // USER
  // ─────────────────────────────────────────────

  private loadCurrentUser(): void {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      this.userInitial = user?.name?.charAt(0) || 'م';
    } catch {
      this.userInitial = 'م';
    }
  }

  // ─────────────────────────────────────────────
  // HISTORY
  // ─────────────────────────────────────────────

  /**
   * ENDPOINT: GET /api/v1/chat/history
   * يُحمّل قائمة المحادثات السابقة في الشريط الجانبي
   */
  loadHistory(): void {
    // TODO: this.http.get('/api/v1/chat/history').subscribe(res => { this.conversationHistory = res.conversations })
    this.conversationHistory = [];
  }

  /**
   * ENDPOINT: GET /api/v1/chat/history/:id
   * يُحمّل رسائل المحادثة المختارة ويضعها في messages[]
   */
  loadConversation(conv: Conversation): void {
    this.activeConvId = conv.id;
    this.messages = conv.messages ? [...conv.messages] : [];
    this.shouldScroll = true;
    // TODO: this.http.get(`/api/v1/chat/history/${conv.id}`).subscribe(res => { this.messages = res.messages })
  }

  /**
   * ENDPOINT: DELETE /api/v1/chat/history/:id
   * يحذف المحادثة من conversationHistory
   */
  deleteConversation(id: number, event: Event): void {
    event.stopPropagation();
    if (!confirm('هل تريد حذف هذه المحادثة؟')) return;
    this.conversationHistory = this.conversationHistory.filter(c => c.id !== id);
    if (this.activeConvId === id) {
      this.clearConversation();
    }
    // TODO: this.http.delete(`/api/v1/chat/history/${id}`).subscribe(...)
  }

  // ─────────────────────────────────────────────
  // MESSAGING
  // ─────────────────────────────────────────────

  /**
   * ENDPOINT: POST /api/v1/chat/send
   * Body: { message: string, conversationId?: number }
   * Response: { reply: string, conversationId: number, title?: string }
   * يُضيف رسالة المستخدم لـ messages[] ثم يُضيف رد الـ AI
   * بعد النجاح يُحدّث conversationHistory بعنوان المحادثة
   */
  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isTyping) return;

    // أضف رسالة المستخدم
    this.messages.push({
      id:     this.msgIdCounter++,
      text,
      isUser: true,
      time:   this.getTime(),
      rating: null
    });
    this.inputText   = '';
    this.isTyping    = true;
    this.shouldScroll = true;
    this.resetInputHeight();

    // TODO: استبدل بـ http.post('/api/v1/chat/send', { message: text, conversationId: this.activeConvId }).subscribe(...)
    // مثال: على استجابة الـ API: { reply: '...', conversationId: 5, title: 'محادثة جديدة' }
  }

  sendQuickMessage(text: string): void {
    this.inputText = text;
    this.sendMessage();
  }

  /** يمسح الرسائل الحالية ويبدأ محادثة جديدة */
  clearConversation(): void {
    this.messages    = [];
    this.activeConvId = null;
    this.inputText   = '';
  }

  // ─────────────────────────────────────────────
  // MESSAGE ACTIONS
  // ─────────────────────────────────────────────

  copyMessage(text: string): void {
    navigator.clipboard.writeText(text).then(() => this.showToast('تم نسخ الرسالة'));
  }

  copyConversation(): void {
    const text = this.messages.map(m => `${m.isUser ? 'أنت' : 'المساعد'}: ${m.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => this.showToast('تم نسخ المحادثة'));
  }

  /**
   * ENDPOINT: POST /api/v1/chat/messages/:id/rate
   * Body: { rating: 'up' | 'down' }
   */
  rateMessage(msg: ChatMessage, rating: 'up' | 'down'): void {
    msg.rating = msg.rating === rating ? null : rating;
    // TODO: this.http.post(`/api/v1/chat/messages/${msg.id}/rate`, { rating: msg.rating }).subscribe(...)
  }

  // ─────────────────────────────────────────────
  // UI HELPERS
  // ─────────────────────────────────────────────

  /** Enter = إرسال، Shift+Enter = سطر جديد */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /** يُكبّر حقل النص تلقائياً مع الكتابة */
  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  private resetInputHeight(): void {
    if (this.messageInput?.nativeElement) {
      this.messageInput.nativeElement.style.height = 'auto';
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  private getTime(): string {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = '', 2500);
  }
}