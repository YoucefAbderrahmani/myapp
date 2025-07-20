document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const editBtn = document.getElementById('editProfileBtn');
  const cancelBtn = document.getElementById('cancelEditBtn');
  const profileView = document.getElementById('profileView');
  const profileEdit = document.getElementById('profileEdit');
  const editForm = document.getElementById('profileEditForm');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const avatarUpload = document.getElementById('avatarUpload');
  const avatarPreview = document.getElementById('avatarPreview');

  // Toggle between view and edit modes
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      profileView.style.display = 'none';
      profileEdit.style.display = 'block';
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      profileEdit.style.display = 'none';
      profileView.style.display = 'block';
      // Reset password fields
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    });
  }

  // Avatar upload handling
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', () => {
      avatarUpload.click();
    });
  }

  if (avatarUpload) {
    avatarUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Client-side validation
        if (!file.type.match('image.*')) {
          showToast('Please select an image file', 'error');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          showToast('Image must be less than 5MB', 'error');
          return;
        }

        // Preview image
        const reader = new FileReader();
        reader.onload = (event) => {
          avatarPreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Form submission
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData();
      const avatarFile = avatarUpload.files[0];
      const username = document.getElementById('editUsername').value;
      const phone = document.getElementById('editPhone').value;
      const bio = document.getElementById('editBio').value;
      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Validate password change if any password field is filled
      if (currentPassword || newPassword || confirmPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          showToast('Please fill all password fields to change password', 'error');
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast('New passwords do not match', 'error');
          return;
        }
        if (newPassword.length < 8) {
          showToast('Password must be at least 8 characters', 'error');
          return;
        }
      }

      // Append data to FormData
      if (avatarFile) formData.append('avatar', avatarFile);
      formData.append('username', username);
      formData.append('phone', phone);
      formData.append('bio', bio);
      if (currentPassword) formData.append('currentPassword', currentPassword);
      if (newPassword) formData.append('newPassword', newPassword);

      try {
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update profile');
        }

        // Update the view
        document.querySelector('h2').textContent = username;
        document.getElementById('bioText').textContent = bio || 'No bio provided';
        
        if (result.avatarUrl) {
          document.querySelector('.profile-view .profile-avatar').src = result.avatarUrl;
        }
        
        if (phone) {
          const phoneDisplay = document.querySelector('.profile-phone') || document.createElement('p');
          phoneDisplay.className = 'profile-phone';
          phoneDisplay.textContent = `Phone: ${phone}`;
          if (!document.querySelector('.profile-phone')) {
            document.querySelector('.profile-view h2').after(phoneDisplay);
          }
        }

        // Switch back to view mode
        profileEdit.style.display = 'none';
        profileView.style.display = 'block';

        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        showToast('Profile updated successfully!');
      } catch (error) {
        console.error('Update error:', error);
        showToast(error.message || 'Failed to update profile', 'error');
      }
    });
  }

  // Toast notification function
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
});