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
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ForgetPassword } from './auth/forget-password/forget-password';
 
export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'layout', component: Layout },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  {path:'forget-password', component: ForgetPassword},
  { path: 'dashboard', component: Dashboard },
  { path: 'marketing', component: Marketing },
  { path: 'sidebar', component: SideBar },
  { path: 'financial-overview', component: FinancialOverview },
  { path: 'tasks-and-team', component: TasksAndTeam },
  { path: 'analytics', component: Analytics },
  { path: 'community', component: Community },
  { path: 'rewards', component: Rewards },
  { path: 'reports', component: Reports },
];