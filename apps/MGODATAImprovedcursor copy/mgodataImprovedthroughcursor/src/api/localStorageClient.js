// LocalStorage-based entity client to replace Base44 entities
// This provides a simple in-memory database using localStorage

class LocalStorageEntity {
  constructor(entityName) {
    this.entityName = entityName;
    this.storageKey = `mgo_data_${entityName}`;
  }

  // Initialize storage if needed
  _initStorage() {
    if (!localStorage.getItem(this.storageKey)) {
      localStorage.setItem(this.storageKey, JSON.stringify([]));
    }
  }

  // Get all items
  _getAll() {
    this._initStorage();
    const data = localStorage.getItem(this.storageKey);
    return JSON.parse(data || '[]');
  }

  // Save all items
  _saveAll(items) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  // Create a new item
  async create(data) {
    this._initStorage();
    const items = this._getAll();
    const newItem = {
      id: `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString()
    };
    items.push(newItem);
    this._saveAll(items);
    return newItem;
  }

  // Get all items (with optional filter and sort)
  async list(sortBy = null, limit = null) {
    this._initStorage();
    let items = this._getAll();
    
    // Sort
    if (sortBy) {
      const isDesc = sortBy.startsWith('-');
      const field = isDesc ? sortBy.substring(1) : sortBy;
      items.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        if (isDesc) {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    }
    
    // Limit
    if (limit) {
      items = items.slice(0, limit);
    }
    
    return items;
  }

  // Filter items
  async filter(filters = {}, sortBy = null, limit = null) {
    this._initStorage();
    let items = this._getAll();
    
    // Apply filters
    if (filters && Object.keys(filters).length > 0) {
      items = items.filter(item => {
        return Object.keys(filters).every(key => {
          const filterValue = filters[key];
          const itemValue = item[key];
          
          if (filterValue === null || filterValue === undefined) {
            return itemValue === filterValue;
          }
          
          if (typeof filterValue === 'boolean') {
            return itemValue === filterValue;
          }
          
          if (typeof filterValue === 'string') {
            return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
          }
          
          return itemValue === filterValue;
        });
      });
    }
    
    // Sort
    if (sortBy) {
      const isDesc = sortBy.startsWith('-');
      const field = isDesc ? sortBy.substring(1) : sortBy;
      items.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        if (isDesc) {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    }
    
    // Limit
    if (limit) {
      items = items.slice(0, limit);
    }
    
    return items;
  }

  // Get item by ID
  async get(id) {
    this._initStorage();
    const items = this._getAll();
    return items.find(item => item.id === id) || null;
  }

  // Update item
  async update(id, data) {
    this._initStorage();
    const items = this._getAll();
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }
    
    items[index] = {
      ...items[index],
      ...data,
      updated_date: new Date().toISOString()
    };
    
    this._saveAll(items);
    return items[index];
  }

  // Delete item
  async delete(id) {
    this._initStorage();
    const items = this._getAll();
    const filtered = items.filter(item => item.id !== id);
    this._saveAll(filtered);
    return { success: true };
  }
}

// Create entity instances
export const Business = new LocalStorageEntity('Business');
export const AuditReport = new LocalStorageEntity('AuditReport');
export const AuditTask = new LocalStorageEntity('AuditTask');
export const VisibilityCheck = new LocalStorageEntity('VisibilityCheck');
export const Prospect = new LocalStorageEntity('Prospect');
export const AuditResult = new LocalStorageEntity('AuditResult');
export const ContentKit = new LocalStorageEntity('ContentKit');
export const Report = new LocalStorageEntity('Report');
export const BusinessAssistantResponse = new LocalStorageEntity('BusinessAssistantResponse');
export const Subscription = new LocalStorageEntity('Subscription');
export const ScanCounter = new LocalStorageEntity('ScanCounter');
export const FAQ = new LocalStorageEntity('FAQ');
export const Review = new LocalStorageEntity('Review');
export const SEOSettings = new LocalStorageEntity('SEOSettings');
export const BusinessConnection = new LocalStorageEntity('BusinessConnection');
export const ScanLead = new LocalStorageEntity('ScanLead');
export const WaitlistEntry = new LocalStorageEntity('WaitlistEntry');
export const ScanResult = new LocalStorageEntity('ScanResult');

// Auth mock (simplified) - used for demo/local AGS; real auth is via GEO Command Center
export const User = {
  current: async () => {
    const userStr = localStorage.getItem('mgo_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },
  me: async () => {
    const userStr = localStorage.getItem('mgo_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },
  signIn: async (email, password) => {
    const user = { email, id: `user_${Date.now()}` };
    localStorage.setItem('mgo_current_user', JSON.stringify(user));
    return user;
  },
  signOut: async () => {
    localStorage.removeItem('mgo_current_user');
    return { success: true };
  },
  logout: async () => {
    localStorage.removeItem('mgo_current_user');
    return { success: true };
  }
};

