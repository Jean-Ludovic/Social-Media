import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  displayName = '';
  email       = '';
  password    = '';
  loading     = false;
  error       = '';

  onSubmit() {
    if (!this.email || !this.password || !this.displayName) return;
    this.loading = true;
    this.error   = '';

    this.auth.register({ email: this.email, password: this.password, displayName: this.displayName }).subscribe({
      next: () => {
        this.router.navigate(['/feed']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 409) {
          this.error = 'Cet email est déjà utilisé.';
        } else if (err.status === 400) {
          const msg = err.error?.message;
          this.error = Array.isArray(msg) ? msg[0] : (msg ?? 'Données invalides. Vérifiez vos informations.');
        } else {
          this.error = 'Une erreur est survenue. Réessayez.';
        }
      },
    });
  }
}
