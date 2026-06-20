import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  displayName = '';
  email = '';
  password = '';
  loading = false;

  onSubmit() {
    if (!this.email || !this.password || !this.displayName) return;
    this.loading = true;
    // TODO: inject AuthService and call register()
  }
}
