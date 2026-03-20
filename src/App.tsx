import { Route, Switch } from 'wouter';
import { Dashboard } from './pages/Dashboard.tsx';
import { ProjectView } from './pages/ProjectView.tsx';
import { CalculationDetail } from './pages/CalculationDetail.tsx';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/project/:id" component={ProjectView} />
        <Route path="/project/:projectId/calc/:calcId" component={CalculationDetail} />
        <Route>
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </Route>
      </Switch>
    </div>
  );
}

export default App;
