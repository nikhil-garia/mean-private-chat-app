import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { authGuard } from './guard/auth.guard'; import { loginGuard } from './guard/login.guard';

export const routes: Routes = [
    {
        path: '', redirectTo: 'login', pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login.component').then((l) => l.LoginComponent),
        title: 'Login',
        canActivate: [loginGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./pages/register/register.component').then((l) => l.RegisterComponent),
        title: 'Register',
        canActivate: [loginGuard]
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./pages/forgot-password/forgot-password.component').then((l) => l.ForgotPasswordComponent),
        title: 'Forgot Password',
        canActivate: [loginGuard]
    },
    {
        path: 'reset-password',
        loadComponent: () => import('./pages/reset-password/reset-password.component').then((l) => l.ResetPasswordComponent),
        title: 'Reset Password',
        canActivate: [loginGuard]
    },
    {
        path: 'chat',
        loadComponent: () => import('./pages/chat/chat.component').then((l) => l.ChatComponent),
        title: 'Chat',
        canActivate: [authGuard]
    }, {
        path: '',
        loadComponent: () => import('./pages/layout/layout.component').then((l) => l.LayoutComponent),
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./pages/dashboard/dashboard.component').then((l) => l.DashboardComponent),

                title: 'Dashboard',
                canActivate: [authGuard]
            },
            {
                path: 'about',
                loadComponent: () => import('./pages/about/about.component').then((l) => l.AboutComponent),
                title: 'About',
                canActivate: [authGuard]
            }
        ]
    },
    // 404 routes
    {
        path: '**',
        loadComponent: () => import('./pages/wrong-route/wrong-route.component').then((l) => l.WrongRouteComponent),
        title: '404',
    },
];
@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }