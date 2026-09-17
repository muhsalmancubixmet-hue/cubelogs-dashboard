/**
 * Project Tasks Navigation & Routing Unit Tests
 */

describe('Sidebar Project Management & Tasks Navigation', () => {
  // Helper mimicking the Sidebar logic for nav path and active state
  function getSidebarNavDetails(navItem, activeProjectId, pathname, activeTab = '') {
    let navPath = navItem.path;
    let isNavActive = false;

    if (navItem.id === 'tasks') {
      navPath = activeProjectId ? `/projects/${activeProjectId}/tasks` : '/tasks';
      isNavActive = pathname === '/tasks' || pathname.endsWith('/tasks') || pathname.includes('/tasks');
    } else if (navItem.id === 'projects') {
      navPath = '/projects';
      isNavActive = (pathname === '/projects' || (pathname.startsWith('/projects/') && !pathname.includes('/tasks'))) && !activeTab;
    } else {
      const [basePath, queryString] = navItem.path.split('?');
      if (queryString) {
        const params = new URLSearchParams(queryString);
        const navTab = params.get('tab');
        isNavActive = pathname === basePath && activeTab === navTab;
      } else {
        isNavActive = (pathname === basePath || pathname.startsWith(basePath + '/')) && !activeTab;
      }
    }

    return { navPath, isNavActive };
  }

  test('1. Sidebar Tasks nav targets active project tasks workspace when activeProjectId is available', () => {
    const nav = { id: 'tasks', label: 'Tasks', path: '/tasks' };
    const { navPath } = getSidebarNavDetails(nav, '3', '/dashboard');
    expect(navPath).toBe('/projects/3/tasks');
  });

  test('2. Sidebar Tasks nav falls back to /tasks when activeProjectId is not yet loaded', () => {
    const nav = { id: 'tasks', label: 'Tasks', path: '/tasks' };
    const { navPath } = getSidebarNavDetails(nav, null, '/dashboard');
    expect(navPath).toBe('/tasks');
  });

  test('3. On /projects/3/tasks, Tasks nav is active and Projects nav is NOT active', () => {
    const tasksNav = { id: 'tasks', label: 'Tasks', path: '/tasks' };
    const projectsNav = { id: 'projects', label: 'Projects', path: '/projects' };

    const tasksState = getSidebarNavDetails(tasksNav, '3', '/projects/3/tasks');
    const projectsState = getSidebarNavDetails(projectsNav, '3', '/projects/3/tasks');

    expect(tasksState.isNavActive).toBe(true);
    expect(projectsState.isNavActive).toBe(false);
  });

  test('4. On /projects/3 (overview), Projects nav is active and Tasks nav is NOT active', () => {
    const tasksNav = { id: 'tasks', label: 'Tasks', path: '/tasks' };
    const projectsNav = { id: 'projects', label: 'Projects', path: '/projects' };

    const tasksState = getSidebarNavDetails(tasksNav, '3', '/projects/3');
    const projectsState = getSidebarNavDetails(projectsNav, '3', '/projects/3');

    expect(tasksState.isNavActive).toBe(false);
    expect(projectsState.isNavActive).toBe(true);
  });

  test('5. On /projects/3/backlog, Projects nav is active and Tasks nav is NOT active', () => {
    const tasksNav = { id: 'tasks', label: 'Tasks', path: '/tasks' };
    const projectsNav = { id: 'projects', label: 'Projects', path: '/projects' };

    const tasksState = getSidebarNavDetails(tasksNav, '3', '/projects/3/backlog');
    const projectsState = getSidebarNavDetails(projectsNav, '3', '/projects/3/backlog');

    expect(tasksState.isNavActive).toBe(false);
    expect(projectsState.isNavActive).toBe(true);
  });

  test('6. On /projects, Projects nav is active and Tasks nav is NOT active', () => {
    const tasksNav = { id: 'tasks', label: 'Tasks', path: '/tasks' };
    const projectsNav = { id: 'projects', label: 'Projects', path: '/projects' };

    const tasksState = getSidebarNavDetails(tasksNav, '3', '/projects');
    const projectsState = getSidebarNavDetails(projectsNav, '3', '/projects');

    expect(tasksState.isNavActive).toBe(false);
    expect(projectsState.isNavActive).toBe(true);
  });

  test('7. On /tasks, Tasks nav is active', () => {
    const tasksNav = { id: 'tasks', label: 'Tasks', path: '/tasks' };
    const tasksState = getSidebarNavDetails(tasksNav, '3', '/tasks');
    expect(tasksState.isNavActive).toBe(true);
  });
});
