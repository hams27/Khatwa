import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { Layout } from './layout/layout';
import { Dashboard } from './dashboard/dashboard';
import { Marketing } from './marketing/marketing';
import { SideBar } from './side-bar/side-bar';
import { FinancialOverview } from './financial-overview/financial-overview';
import { TasksAndTeam } from './tasks-and-team/tasks-and-team';
import { Analytics } from './analytics/analytics';
import { Community } from './community/community';
import { Rewards } from './rewards/rewards';
import { Reports } from './reports/reports';
import { Chat } from './chat/chat';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ForgetPassword } from './auth/forget-password/forget-password';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forget-password', component: ForgetPassword },
  { path: 'layout',           component: Layout,           canActivate: [authGuard] },
  { path: 'dashboard',        component: Dashboard,        canActivate: [authGuard] },
  { path: 'marketing',        component: Marketing,        canActivate: [authGuard] },
  { path: 'sidebar',          component: SideBar,          canActivate: [authGuard] },
  { path: 'financial-overview', component: FinancialOverview, canActivate: [authGuard] },
  { path: 'tasks-and-team',   component: TasksAndTeam,     canActivate: [authGuard] },
  { path: 'analytics',        component: Analytics,        canActivate: [authGuard] },
  { path: 'community',        component: Community,        canActivate: [authGuard] },
  { path: 'rewards',          component: Rewards,          canActivate: [authGuard] },
  { path: 'reports',          component: Reports,          canActivate: [authGuard] },
  { path: 'chat',             component: Chat,             canActivate: [authGuard] },
];