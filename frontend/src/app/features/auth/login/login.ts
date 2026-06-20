import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth  = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  email    = '';
  password = '';
  loading  = false;
  error    = '';

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading = true;
    this.error   = '';

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/feed';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.status === 401
          ? 'Email ou mot de passe incorrect.'
          : 'Une erreur est survenue. Réessayez.';
      },
    });
  }
}
