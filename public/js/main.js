// Main JavaScript file for BeatsHQ.
// Loaded on all pages to provide common functionality.

// Run shared UI behaviors after the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', function() {
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });

    // Add smooth scrolling to all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Confirm delete actions
    const deleteButtons = document.querySelectorAll('[data-confirm]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm(this.getAttribute('data-confirm'))) {
                e.preventDefault();
            }
        });
    });

    // Handle Choose File button for audio upload.
    const chooseFileBtn = document.getElementById('chooseFileBtn');
    const audioFile = document.getElementById('audioFile');
    const selectedFileText = document.getElementById('selectedFileText');
    
    if (chooseFileBtn && audioFile) {
        chooseFileBtn.addEventListener('click', function() {
            audioFile.click();
        });
        
        audioFile.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                selectedFileText.textContent = `✓ Selected: ${file.name}`;
            }
        });
    }

    // Enable library search if we are on the library page.
    initLibrarySearch();
});

// Library Page - Download Sample Function
function downloadSample(sampleId) {
    // Trigger file download by navigating to the download endpoint
    window.location.href = '/samples/download/' + sampleId;
}

function initLibrarySearch() {
    const searchInput = document.getElementById('librarySearchInput');
    if (!searchInput) {
        // Exit early when the library UI is not present.
        return;
    }

    const packHeaders = Array.from(document.querySelectorAll('.library-page .library-pack-header'));
    const sampleBlocks = Array.from(document.querySelectorAll('.library-page [data-sample-title]'));

    // Filter packs and samples based on the current query.
    function applyLibraryFilter() {
        const query = (searchInput.value || '').trim().toLowerCase();

        if (!query) {
            // Reset all rows when the query is empty.
            packHeaders.forEach(pack => {
                pack.style.display = '';
                const packId = pack.getAttribute('data-pack-id');
                const sampleContainer = document.querySelector(`.library-page .library-pack-samples[data-pack-id="${packId}"]`);
                if (sampleContainer) {
                    sampleContainer.style.display = '';
                }
            });
            sampleBlocks.forEach(sample => {
                sample.style.display = '';
            });
            return;
        }

        // Filter individual sample rows.
        sampleBlocks.forEach(sample => {
            const title = sample.getAttribute('data-sample-title') || '';
            const type = sample.getAttribute('data-sample-type') || '';
            const matches = title.includes(query) || type.includes(query);
            sample.style.display = matches ? '' : 'none';
        });

        // Show packs that match metadata or contain visible samples.
        packHeaders.forEach(pack => {
            const packName = pack.getAttribute('data-pack-name') || '';
            const packGenre = pack.getAttribute('data-pack-genre') || '';
            const packId = pack.getAttribute('data-pack-id');
            const sampleContainer = document.querySelector(`.library-page .library-pack-samples[data-pack-id="${packId}"]`);
            const packMatches = packName.includes(query) || packGenre.includes(query);

            if (packMatches) {
                pack.style.display = '';
                if (sampleContainer) {
                    sampleContainer.style.display = '';
                    sampleContainer.querySelectorAll('[data-sample-title]').forEach(sample => {
                        sample.style.display = '';
                    });
                }
                return;
            }

            const anySampleVisible = sampleContainer
                ? Array.from(sampleContainer.querySelectorAll('[data-sample-title]'))
                    .some(sample => sample.style.display !== 'none')
                : false;

            pack.style.display = anySampleVisible ? '' : 'none';
            if (sampleContainer) {
                sampleContainer.style.display = anySampleVisible ? '' : 'none';
            }
        });
    }

    // Update results as the user types.
    searchInput.addEventListener('input', applyLibraryFilter);
}

// Admin Page Functions
const showElement = (el) => el && el.classList.remove('hidden');
const hideElement = (el) => el && el.classList.add('hidden');

// Admin tab management
if (document.getElementById('adminTabs')) {
    // Track the current tab so server redirects land in the right place.
    const activeTab = document.querySelector('[data-active-tab]')?.dataset.activeTab || 'upload';
    let currentTab = activeTab;

    const getCurrentTab = () => currentTab || activeTab;

    // Inject a hidden field so the server can preserve the active tab.
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (!form || !form.action || !form.action.includes('/admin')) {
            return;
        }

        const tab = getCurrentTab();
        let tabInput = form.querySelector('input[name="tab"]');
        if (!tabInput) {
            tabInput = document.createElement('input');
            tabInput.type = 'hidden';
            tabInput.name = 'tab';
            form.appendChild(tabInput);
        }
        tabInput.value = tab;
    }, true);

    // Lazy loaders for each admin tab.
    const tabLoaders = {
        '#samples': loadSamples,
        '#packs': loadPacks,
        '#users': () => {
            loadUsers();
            loadCreditGrants();
        }
    };

    // When a tab is shown, update state and load its data.
    document.getElementById('adminTabs').addEventListener('shown.bs.tab', function(e) {
        const target = e.target.getAttribute('data-bs-target');
        if (target) {
            currentTab = target.replace('#', '');
        }
        const loader = tabLoaders[target];
        if (loader) {
            loader();
        }
    });
    
    // Load packs for the dropdown
    loadPacksDropdown();
    
    let packsNameMap = {};

    // Populate pack lists for upload and filters.
    function loadPacksDropdown() {
        fetch('/admin/packs')
            .then(response => response.json())
            .then(data => {
                const packSelect = document.getElementById('pack_id');
                const samplesPackFilter = document.getElementById('samplesPackFilter');
                packsNameMap = {};
                (data.packs || []).forEach(pack => {
                    packsNameMap[String(pack.id)] = pack.name;
                });
                if (packSelect) {
                    packSelect.innerHTML = '<option value="">Select a pack</option>';
                    data.packs.forEach(pack => {
                        packSelect.innerHTML += `<option value="${pack.id}">${pack.name}</option>`;
                    });
                }
                if (samplesPackFilter) {
                    samplesPackFilter.innerHTML = '<option value="">All packs</option>';
                    data.packs.forEach(pack => {
                        samplesPackFilter.innerHTML += `<option value="${pack.id}">${pack.name}</option>`;
                    });
                }
            })
            .catch(error => console.error('Error loading packs dropdown:', error));
    }
    
    // Cache packs for client-side filtering.
    let packsCache = [];

    // Render the pack rows in the admin table.
    function renderPacksTable(packs) {
        const tbody = document.getElementById('packsTableBody');
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';

        packs.forEach(pack => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${pack.name}</strong></td>
                <td>${pack.genre || '-'}</td>
                <td><span class="badge bg-primary">${pack.total_credits || 0} Credits</span></td>
                <td>${pack.sample_count || 0} samples</td>
                <td>
                    <button onclick="editPack(${pack.id}, '${pack.name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${(pack.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${pack.genre || ''}')" class="btn btn-primary btn-sm me-1">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                      <form method="POST" action="/admin/delete-pack/${pack.id}" class="form-inline" 
                          onsubmit="return confirm('Are you sure? This will remove the pack but keep the samples.');">
                        <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                    </form>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Filter packs by name or genre based on input text.
    function filterPacks(searchValue) {
        const normalized = (searchValue || '').trim().toLowerCase();
        if (!normalized) {
            return packsCache;
        }
        return packsCache.filter(pack => {
            const name = (pack.name || '').toLowerCase();
            const genre = (pack.genre || '').toLowerCase();
            return name.includes(normalized) || genre.includes(normalized);
        });
    }

    // Fetch packs from the server and show them in the table.
    function loadPacks() {
        const packsLoading = document.getElementById('packsLoading');
        const packsTable = document.getElementById('packsTable');
        const noPacks = document.getElementById('noPacks');
        const packsSearchInput = document.getElementById('packsSearchInput');

        showElement(packsLoading);
        hideElement(packsTable);
        hideElement(noPacks);
        
        fetch('/admin/packs')
            .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Packs data received:', data);
                hideElement(packsLoading);
                
                if (!data.packs || data.packs.length === 0) {
                    showElement(noPacks);
                    return;
                }
                
                packsCache = data.packs || [];
                const filtered = filterPacks(packsSearchInput ? packsSearchInput.value : '');
                renderPacksTable(filtered);
                
                showElement(packsTable);
            })
            .catch(error => {
                console.error('Error loading packs:', error);
                hideElement(packsLoading);
                showElement(noPacks);
                if (noPacks) {
                    noPacks.innerHTML = '<p class="text-danger">Error loading packs: ' + error.message + '</p>';
                }
            });
    }

    const packsSearchInput = document.getElementById('packsSearchInput');
    if (packsSearchInput) {
        packsSearchInput.addEventListener('input', function() {
            renderPacksTable(filterPacks(packsSearchInput.value));
        });
    }
    
    // Open the edit pack modal with pre-filled values.
    window.editPack = function(id, name, description, genre) {
        document.getElementById('editPackIdField').value = id;
        document.getElementById('editPackName').value = name;
        document.getElementById('editPackDescription').value = description;
        document.getElementById('editPackGenre').value = genre;
        
        document.getElementById('editPackForm').action = '/admin/edit-pack/' + id;
        
        const editModal = new bootstrap.Modal(document.getElementById('editPackModal'));
        editModal.show();
    }
    
    // Reload pack dropdown when a pack is created
    const createPackForm = document.getElementById('createPackForm');
    if (createPackForm) {
        createPackForm.addEventListener('submit', function() {
            setTimeout(() => {
                loadPacksDropdown();
                if (document.getElementById('packs-tab')?.classList.contains('active')) {
                    loadPacks();
                }
            }, 500);
        });
    }
    
    // Also reload when page loads if we just created a pack
    window.addEventListener('DOMContentLoaded', function() {
        loadPacksDropdown();
    });
    
    // Cache samples for client-side filtering.
    let samplesCache = [];

    // Render the sample rows in the admin table.
    function renderSamplesTable(samples) {
        const tbody = document.getElementById('samplesTableBody');
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';

        samples.forEach(sample => {
            const row = document.createElement('tr');
            const typeValue = (sample.type || 'sample').toLowerCase();
            const typeLabel = typeValue === 'loop' ? 'Loop' : (typeValue === 'track' ? 'Track' : 'One-Shot');
            const typeClass = typeValue === 'loop' ? 'bg-info' : (typeValue === 'track' ? 'bg-warning text-dark' : 'bg-secondary');

            const resolvedPackName = sample.pack_name || packsNameMap[String(sample.pack_id)] || '';
            row.innerHTML = `
                <td><strong>${sample.title}</strong><br><small class="text-muted">${sample.filename}</small></td>
                <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                <td>${(typeValue === 'loop' || typeValue === 'track') && sample.bpm ? sample.bpm : '-'}</td>
                <td><span class="badge bg-primary">${sample.credits} Credit${sample.credits !== 1 ? 's' : ''}</span></td>
                <td>${resolvedPackName || (sample.pack_id ? `#${sample.pack_id}` : 'Unknown')}</td>
                <td>${sample.uploader_name || 'Unknown'}</td>
                <td>
                    <button onclick="editSample(${sample.id}, '${sample.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${sample.type}', ${sample.bpm || 'null'}, ${sample.credits})" class="btn btn-primary btn-sm me-1">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                      <form method="POST" action="/admin/delete-sample/${sample.id}" class="form-inline" 
                          onsubmit="return confirm('Are you sure you want to delete this sample?');">
                        <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                    </form>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Filter samples by query and optional pack filter.
    function filterSamples(searchValue, packId) {
        const query = (searchValue || '').trim().toLowerCase();
        const packFilter = (packId || '').toString();

        return samplesCache.filter(sample => {
            const matchesPack = !packFilter || String(sample.pack_id) === packFilter;
            if (!matchesPack) {
                return false;
            }
            if (!query) {
                return true;
            }
            const title = (sample.title || '').toLowerCase();
            const filename = (sample.filename || '').toLowerCase();
            const uploader = (sample.uploader_name || '').toLowerCase();
            const packName = (sample.pack_name || '').toLowerCase();
            return title.includes(query) || filename.includes(query) || uploader.includes(query) || packName.includes(query);
        });
    }

    // Fetch samples from the server and show them in the table.
    function loadSamples() {
        const samplesLoading = document.getElementById('samplesLoading');
        const samplesTable = document.getElementById('samplesTable');
        const noSamples = document.getElementById('noSamples');
        const samplesSearchInput = document.getElementById('samplesSearchInput');
        const samplesPackFilter = document.getElementById('samplesPackFilter');

        showElement(samplesLoading);
        hideElement(samplesTable);
        hideElement(noSamples);
        
        fetch('/admin/samples')
            .then(response => response.json())
            .then(data => {
                hideElement(samplesLoading);
                
                if (data.samples.length === 0) {
                    showElement(noSamples);
                    return;
                }
                
                samplesCache = data.samples || [];
                const filtered = filterSamples(
                    samplesSearchInput ? samplesSearchInput.value : '',
                    samplesPackFilter ? samplesPackFilter.value : ''
                );
                renderSamplesTable(filtered);
                
                showElement(samplesTable);
            })
            .catch(error => {
                console.error('Error loading samples:', error);
                hideElement(samplesLoading);
                alert('Error loading samples');
            });
    }

    const samplesSearchInput = document.getElementById('samplesSearchInput');
    const samplesPackFilter = document.getElementById('samplesPackFilter');
    if (samplesSearchInput) {
        samplesSearchInput.addEventListener('input', function() {
            renderSamplesTable(filterSamples(samplesSearchInput.value, samplesPackFilter ? samplesPackFilter.value : ''));
        });
    }
    if (samplesPackFilter) {
        samplesPackFilter.addEventListener('change', function() {
            renderSamplesTable(filterSamples(samplesSearchInput ? samplesSearchInput.value : '', samplesPackFilter.value));
        });
    }
    
    // Cache users for client-side filtering.
    let usersCache = [];

    // Render the user rows in the admin table.
    function renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
            const isAdmin = user.is_admin == 1 || user.is_admin === true;
            const credits = Number.isFinite(user.credits) ? user.credits : (user.credits || 0);

            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-primary">${credits} Credit${credits !== 1 ? 's' : ''}</span></td>
                <td>
                    ${isAdmin ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>'}
                </td>
                <td>${joinDate}</td>
                <td>
                    <form method="POST" action="/admin/toggle-admin/${user.id}" class="form-inline">
                        <button type="submit" class="btn btn-warning btn-sm">
                            ${isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                    </form>
                      <form method="POST" action="/admin/delete-user/${user.id}" class="form-inline" 
                          onsubmit="return confirm('Are you sure you want to delete this user?');">
                        <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                    </form>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Filter users by name or email.
    function filterUsers(searchValue) {
        const query = (searchValue || '').trim().toLowerCase();
        if (!query) {
            return usersCache;
        }
        return usersCache.filter(user => {
            const nameValue = (user.name || '').toLowerCase();
            const emailValue = (user.email || '').toLowerCase();
            return nameValue.includes(query) || emailValue.includes(query);
        });
    }

    // Fetch users from the server and show them in the table.
    function loadUsers() {
        const usersLoading = document.getElementById('usersLoading');
        const usersTable = document.getElementById('usersTable');
        const usersSearchInput = document.getElementById('usersSearchInput');

        showElement(usersLoading);
        hideElement(usersTable);
        
        fetch('/admin/users')
            .then(response => response.json())
            .then(data => {
                hideElement(usersLoading);

                usersCache = data.users || [];
                const filtered = filterUsers(usersSearchInput ? usersSearchInput.value : '');
                renderUsersTable(filtered);
                populateCreditRecipients(usersCache);

                showElement(usersTable);
            })
            .catch(error => {
                console.error('Error loading users:', error);
                hideElement(usersLoading);
                alert('Error loading users');
            });
    }

    const usersSearchInput = document.getElementById('usersSearchInput');
    if (usersSearchInput) {
        usersSearchInput.addEventListener('input', function() {
            renderUsersTable(filterUsers(usersSearchInput.value));
        });
    }

    // Populate grant credits recipient dropdown.
    function populateCreditRecipients(users) {
        const recipientSelect = document.getElementById('creditRecipient');
        const recipientMeta = document.getElementById('creditRecipientMeta');
        if (!recipientSelect) {
            return;
        }

        recipientSelect.innerHTML = '<option value="">Select a user</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.email})`;
            option.dataset.credits = user.credits;
            option.dataset.isAdmin = user.is_admin == 1 || user.is_admin === true;
            recipientSelect.appendChild(option);
        });

        if (recipientMeta) {
            recipientMeta.textContent = '';
        }

        recipientSelect.addEventListener('change', function() {
            const selected = recipientSelect.options[recipientSelect.selectedIndex];
            if (!selected || !selected.value || !recipientMeta) {
                if (recipientMeta) recipientMeta.textContent = '';
                return;
            }
            const credits = selected.dataset.credits || 0;
            const adminLabel = selected.dataset.isAdmin === 'true' || selected.dataset.isAdmin === '1' ? 'Admin' : 'Member';
            recipientMeta.textContent = `${adminLabel} • Current credits: ${credits}`;
        });
    }

    // Recent credit grants table.
    function renderCreditGrantsTable(grants) {
        const tbody = document.getElementById('creditGrantsTableBody');
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';

        grants.forEach(grant => {
            const row = document.createElement('tr');
            const dateValue = grant.created_at ? new Date(grant.created_at).toLocaleString() : 'N/A';
            row.innerHTML = `
                <td>${grant.grantor_name}</td>
                <td>${grant.recipient_name}</td>
                <td><span class="badge bg-primary">${grant.amount}</span></td>
                <td>${grant.note || '-'}</td>
                <td>${dateValue}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function loadCreditGrants() {
        const grantsLoading = document.getElementById('creditGrantsLoading');
        const grantsTable = document.getElementById('creditGrantsTable');
        const noGrants = document.getElementById('noCreditGrants');

        if (!grantsLoading || !grantsTable || !noGrants) {
            return;
        }

        showElement(grantsLoading);
        hideElement(grantsTable);
        hideElement(noGrants);

        fetch('/admin/credit-grants')
            .then(response => response.json())
            .then(data => {
                hideElement(grantsLoading);

                const grants = data.grants || [];
                if (!grants.length) {
                    showElement(noGrants);
                    return;
                }
                renderCreditGrantsTable(grants);
                showElement(grantsTable);
            })
            .catch(error => {
                console.error('Error loading credit grants:', error);
                hideElement(grantsLoading);
                showElement(noGrants);
            });
    }
    
    // Edit sample function
    window.editSample = function(id, title, type, bpm, credits) {
        document.getElementById('editSampleId').value = id;
        document.getElementById('editTitle').value = title;
        document.getElementById('editCredits').value = credits || 1;
        
        // Load packs into edit dropdown.
        fetch('/admin/packs')
            .then(response => response.json())
            .then(data => {
                const editPackSelect = document.getElementById('editPackId');
                editPackSelect.innerHTML = '<option value="">Select a pack</option>';
                data.packs.forEach(pack => {
                    editPackSelect.innerHTML += `<option value="${pack.id}">${pack.name}</option>`;
                });
                
                // Load sample details to populate pack selection.
                fetch('/admin/samples')
                    .then(response => response.json())
                    .then(data => {
                        const sample = data.samples.find(s => s.id === id);
                        if (sample) {
                            document.getElementById('editPackId').value = sample.pack_id || '';
                        }
                    });
            })
            .catch(error => console.error('Error loading packs:', error));
        
        // Set type and BPM fields based on the sample values.
        const editTypeSelect = document.getElementById('editType');
        if (editTypeSelect) {
            editTypeSelect.value = (type || 'sample').toLowerCase();
        }
        if ((type || '').toLowerCase() === 'loop' || (type || '').toLowerCase() === 'track') {
            document.getElementById('editBpmField').style.display = 'block';
            document.getElementById('editBpm').value = bpm || '';
        } else {
            document.getElementById('editBpmField').style.display = 'none';
            document.getElementById('editBpm').value = '';
        }
        
        document.getElementById('editSampleForm').action = '/admin/edit-sample/' + id;
        
        // Open the modal dialog.
        const editModal = new bootstrap.Modal(document.getElementById('editSampleModal'));
        editModal.show();
    }
    
    // Toggle BPM field in edit modal
    const editTypeSelect = document.getElementById('editType');
    const editBpmField = document.getElementById('editBpmField');
    
    if (editTypeSelect) {
        editTypeSelect.addEventListener('change', function() {
            if (editBpmField) {
                editBpmField.style.display = (this.value === 'loop' || this.value === 'track') ? 'block' : 'none';
            }
        });
    }
    
    // File upload preview functionality
    const audioFileInput = document.getElementById('audioFile');
    const selectedFileText = document.getElementById('selectedFileText');
    const uploadForm = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');
    
    if (audioFileInput && selectedFileText) {
        audioFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                selectedFileText.textContent = `✓ Selected: ${file.name}`;
                
                // Validate file size before submission.
                if (file.size > 50 * 1024 * 1024) {
                    alert('File size exceeds 50MB limit!');
                    clearFile();
                }
            } else {
                selectedFileText.textContent = '';
            }
        });
    }
    
    // Reset the file input and label.
    function clearFile() {
        if (audioFileInput) audioFileInput.value = '';
        if (selectedFileText) selectedFileText.textContent = '';
    }
    
    // Utility to format sizes if needed by the UI.
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    
    // Form submission handling
    if (uploadForm && submitBtn) {
        uploadForm.addEventListener('submit', function(e) {
            const typeSelect = document.getElementById('type');
            const bpmInput = document.getElementById('bpm');
            
            // Validate BPM if loop or track is selected.
            if (typeSelect && (typeSelect.value === 'loop' || typeSelect.value === 'track') && bpmInput && !bpmInput.value) {
                e.preventDefault();
                alert('BPM is required for loops and tracks');
                return false;
            }
            
            // Prevent double submit and show a loading state.
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';
        });
        
        // Reset form handler
        uploadForm.addEventListener('reset', function() {
            clearFile();
            const bpmRow = document.getElementById('bpmRow');
            const bpmInput = document.getElementById('bpm');
            if (bpmRow) bpmRow.classList.add('hidden');
            if (bpmInput) bpmInput.removeAttribute('required');
        });
    }
    
    // Toggle BPM field based on type selection
    const typeSelect = document.getElementById('type');
    const bpmRow = document.getElementById('bpmRow');
    const bpmInput = document.getElementById('bpm');
    
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            if (this.value === 'loop' || this.value === 'track') {
                if (bpmRow) bpmRow.classList.remove('hidden');
                if (bpmInput) bpmInput.setAttribute('required', 'required');
            } else {
                if (bpmRow) bpmRow.classList.add('hidden');
                if (bpmInput) {
                    bpmInput.removeAttribute('required');
                    bpmInput.value = '';
                }
            }
        });
    }

    // Load data for the active tab on initial render
    const adminTabValue = document.querySelector('[data-active-tab]')?.dataset.activeTab;
    if (adminTabValue === 'samples') {
        loadSamples();
    } else if (adminTabValue === 'packs') {
        loadPacks();
    } else if (adminTabValue === 'users') {
        loadUsers();
        loadCreditGrants();
    }
}
