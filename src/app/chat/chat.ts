import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SideBar } from '../side-bar/side-bar';
import { AiService } from '../services/ai';
import { ProjectService } from '../services/project';

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

export interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  time: string;
  rating?: 'up' | 'down' | null;
  html?: string; // For rendered markdown
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
  activeProjectId: number = 0; // Context project
  private msgIdCounter = 1;

  // ── سجل المحادثات
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

  constructor(
    private aiService: AiService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef
  ) {}

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadHistory();
    this.loadProjects();
  }
  
  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        if (res.success && res.data && res.data.length > 0) {
          // Default to the first project for context
          this.activeProjectId = res.data[0].id;
        }
      }
    });
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

  loadHistory(): void {
    const raw = localStorage.getItem('chat_history');
    if (raw) {
      try {
        this.conversationHistory = JSON.parse(raw);
      } catch {
        this.conversationHistory = [];
      }
    }
  }

  saveHistory(): void {
    localStorage.setItem('chat_history', JSON.stringify(this.conversationHistory));
  }

  loadConversation(conv: Conversation): void {
    this.activeConvId = conv.id;
    this.messages = conv.messages ? [...conv.messages] : [];
    this.shouldScroll = true;
  }

  deleteConversation(id: number, event: Event): void {
    event.stopPropagation();
    if (!confirm('هل تريد حذف هذه المحادثة؟')) return;
    this.conversationHistory = this.conversationHistory.filter(c => c.id !== id);
    this.saveHistory();
    if (this.activeConvId === id) {
      this.clearConversation();
    }
  }

  // ─────────────────────────────────────────────
  // MESSAGING
  // ─────────────────────────────────────────────

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.isTyping) return;

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id:     this.msgIdCounter++,
      text,
      isUser: true,
      time:   this.getTime(),
      rating: null
    };
    this.messages.push(userMsg);
    
    this.inputText    = '';
    this.isTyping     = true;
    this.shouldScroll = true;
    this.resetInputHeight();

    // 2. Call AI Service
    this.aiService.chat(this.activeProjectId, text, this.messages).subscribe({
      next: (res: any) => {
        if (res.success && res.reply) {
          this.streamResponse(res.reply);
        } else {
          this.isTyping = false;
        }
      },
      error: (err) => {
        console.error('Chat error:', err);
        this.showToast('حدث خطأ أثناء الاتصال بالمساعد');
        this.isTyping = false;
      }
    });
  }

  /**
   * Simulates a typing effect for the AI response
   */
  private streamResponse(fullText: string): void {
    const aiMsg: ChatMessage = {
      id:     this.msgIdCounter++,
      text:   '',
      isUser: false,
      time:   this.getTime(),
      rating: null,
      html:   ''
    };
    this.messages.push(aiMsg);
    
    // Force initial render of the empty bubble
    this.cdr.detectChanges();
    this.shouldScroll = true;

    let i = 0;
    const speed = 20; // ms per chunk

    const interval = setInterval(() => {
      // Add a chunk of characters (1-3 chars) to make it feel more natural
      const chunkSize = Math.floor(Math.random() * 3) + 1;
      const chunk = fullText.slice(i, i + chunkSize);
      
      // Update text property
      aiMsg.text += chunk;
      i += chunk.length;
      
      // Trigger change detection for every chunk
      this.cdr.detectChanges();
      this.shouldScroll = true;

      if (i >= fullText.length) {
        clearInterval(interval);
        aiMsg.text = fullText; // Ensure full text is set
        aiMsg.html = this.parseMarkdown(fullText); // Parse markdown at the end
        this.isTyping = false;
        this.saveConversationState();
        this.cdr.detectChanges(); // Final update
      }
    }, speed);
  }

  private saveConversationState() {
    // If no active conversation, create one
    if (!this.activeConvId) {
      const newId = Date.now();
      const title = this.messages[0].text.substring(0, 30) + (this.messages[0].text.length > 30 ? '...' : '');
      const newConv: Conversation = {
        id: newId,
        title: title,
        date: new Date().toLocaleDateString('ar-EG'),
        messages: this.messages
      };
      this.conversationHistory.unshift(newConv);
      this.activeConvId = newId;
    } else {
      // Update existing
      const conv = this.conversationHistory.find(c => c.id === this.activeConvId);
      if (conv) {
        conv.messages = [...this.messages];
        // Move to top
        this.conversationHistory = this.conversationHistory.filter(c => c.id !== this.activeConvId);
        this.conversationHistory.unshift(conv);
      }
    }
    this.saveHistory();
  }

  private parseMarkdown(text: string): string {
    if (!text) return '';
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
      .replace(/\*(.*?)\*/g, '<i>$1</i>')     // Italic
      .replace(/\n/g, '<br>')                 // Newlines
      .replace(/### (.*?)<br>/g, '<h3>$1</h3>') // Headings
      .replace(/- (.*?)<br>/g, '<li>$1</li>');  // Lists
    
    return html;
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