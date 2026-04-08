import Layout from "./Layout.jsx";

import Businesses from "./Businesses";

import AIVisibility from "./AIVisibility";

import MapsHealth from "./MapsHealth";

import BusinessDetail from "./BusinessDetail";

import AuditReports from "./AuditReports";

import PlanSelection from "./PlanSelection";

import LandingPage from "./LandingPage";

import Landing from "./Landing";

import GeoMeoOperator from "./GeoMeoOperator";

import AddProspect from "./AddProspect";

import pricing from "./pricing";

import signin from "./signin";

import success from "./success";

import cancel from "./cancel";

import CreateAccount from "./CreateAccount";

import ProspectDetail from "./ProspectDetail";

import ProspectAudit from "./ProspectAudit";

import BusinessAssistant from "./BusinessAssistant";

import CompetitorWatchdog from "./CompetitorWatchdog";

import DirectorySyncHub from "./DirectorySyncHub";

import dashboard from "./Dashboard";

import ReputationManager from "./ReputationManager";

import WhyUs from "./WhyUs";

import HowWorks from "./HowWorks";

import AITools from "./AITools";

import CaseStudies from "./CaseStudies";

import OurTeam from "./OurTeam";

import GetSupport from "./GetSupport";

import Dashboard from "./Dashboard";

import GeoVisibilityHeatmap from "./GeoVisibilityHeatmap";

import ReviewSentiment from "./ReviewSentiment";

import ScanResults from "./ScanResults";

import ContentManager from "./ContentManager";

import IntegrateNow from "./IntegrateNow";

import IntegrationResults from "./IntegrationResults";

import Beta from "./beta";

import BetaAdmin from "./BetaAdmin";

import Billing from "./Billing";

import FreeScanLeads from "./FreeScanLeads";

import NotFound from "./NotFound";

import beta from "./beta";

import waitlist from "./waitlist";

import PrivacyPolicy from "./PrivacyPolicy";

import TermsOfService from "./TermsOfService";

import SharedScan from "./SharedScan";

import Invisibility from "./Invisibility";

import OnlineReport from "./online-report";

import ScanRouter from "./ScanRouter";

import ScanPageA from "./ScanPageA";

import ScanPageB from "./ScanPageB";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Businesses: Businesses,
    
    AIVisibility: AIVisibility,
    
    MapsHealth: MapsHealth,
    
    BusinessDetail: BusinessDetail,
    
    AuditReports: AuditReports,
    
    PlanSelection: PlanSelection,
    
    LandingPage: LandingPage,
    
    Landing: Landing,
    
    GeoMeoOperator: GeoMeoOperator,
    
    AddProspect: AddProspect,
    
    pricing: pricing,
    
    signin: signin,
    
    success: success,
    
    cancel: cancel,
    
    CreateAccount: CreateAccount,
    
    ProspectDetail: ProspectDetail,
    
    ProspectAudit: ProspectAudit,
    
    BusinessAssistant: BusinessAssistant,
    
    CompetitorWatchdog: CompetitorWatchdog,
    
    DirectorySyncHub: DirectorySyncHub,
    
    dashboard: Dashboard,
    
    ReputationManager: ReputationManager,
    
    WhyUs: WhyUs,
    
    HowWorks: HowWorks,
    
    AITools: AITools,
    
    CaseStudies: CaseStudies,
    
    OurTeam: OurTeam,
    
    GetSupport: GetSupport,
    
    Dashboard: Dashboard,
    
    GeoVisibilityHeatmap: GeoVisibilityHeatmap,
    
    ReviewSentiment: ReviewSentiment,
    
    ScanResults: ScanResults,
    
    ContentManager: ContentManager,
    
    IntegrateNow: IntegrateNow,
    
    IntegrationResults: IntegrationResults,
    
    Beta: Beta,
    
    BetaAdmin: BetaAdmin,
    
    Billing: Billing,
    
    FreeScanLeads: FreeScanLeads,
    
    NotFound: NotFound,
    
    beta: beta,
    
    waitlist: waitlist,
    
    PrivacyPolicy: PrivacyPolicy,
    
    TermsOfService: TermsOfService,
    
    SharedScan: SharedScan,
    
    Invisibility: Invisibility,
    
    "online-report": OnlineReport,

    ScanRouter: ScanRouter,
    "scan-a": ScanPageA,
    "scan-b": ScanPageB,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Businesses />} />
                
                
                <Route path="/Businesses" element={<Businesses />} />
                
                <Route path="/AIVisibility" element={<AIVisibility />} />
                
                <Route path="/MapsHealth" element={<MapsHealth />} />
                
                <Route path="/BusinessDetail" element={<BusinessDetail />} />
                
                <Route path="/AuditReports" element={<AuditReports />} />
                
                <Route path="/PlanSelection" element={<PlanSelection />} />
                
                <Route path="/LandingPage" element={<LandingPage />} />
                
                <Route path="/Landing" element={<Landing />} />
                
                <Route path="/GeoMeoOperator" element={<GeoMeoOperator />} />
                
                <Route path="/AddProspect" element={<AddProspect />} />
                
                <Route path="/pricing" element={<pricing />} />
                
                <Route path="/signin" element={<signin />} />
                
                <Route path="/success" element={<success />} />
                
                <Route path="/cancel" element={<cancel />} />
                
                <Route path="/CreateAccount" element={<CreateAccount />} />
                
                <Route path="/ProspectDetail" element={<ProspectDetail />} />
                
                <Route path="/ProspectAudit" element={<ProspectAudit />} />
                
                <Route path="/BusinessAssistant" element={<BusinessAssistant />} />
                
                <Route path="/CompetitorWatchdog" element={<CompetitorWatchdog />} />
                
                <Route path="/DirectorySyncHub" element={<DirectorySyncHub />} />
                
                <Route path="/dashboard" element={<dashboard />} />
                
                <Route path="/ReputationManager" element={<ReputationManager />} />
                
                <Route path="/WhyUs" element={<WhyUs />} />
                
                <Route path="/HowWorks" element={<HowWorks />} />
                
                <Route path="/AITools" element={<AITools />} />
                
                <Route path="/CaseStudies" element={<CaseStudies />} />
                
                <Route path="/OurTeam" element={<OurTeam />} />
                
                <Route path="/GetSupport" element={<GetSupport />} />
                <Route path="/get-support" element={<GetSupport />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/GeoVisibilityHeatmap" element={<GeoVisibilityHeatmap />} />
                
                <Route path="/ReviewSentiment" element={<ReviewSentiment />} />
                
                <Route path="/ScanResults" element={<ScanResults />} />
                <Route path="/scanresults" element={<ScanResults />} />
                
                <Route path="/ContentManager" element={<ContentManager />} />
                
                <Route path="/IntegrateNow" element={<IntegrateNow />} />
                
                <Route path="/IntegrationResults" element={<IntegrationResults />} />
                
                <Route path="/Beta" element={<Beta />} />
                
                <Route path="/BetaAdmin" element={<BetaAdmin />} />
                
                <Route path="/NotFound" element={<NotFound />} />
                
                <Route path="/beta" element={<beta />} />
                
                <Route path="/waitlist" element={<waitlist />} />
                
                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
                
                <Route path="/TermsOfService" element={<TermsOfService />} />
                
                <Route path="/SharedScan" element={<SharedScan />} />
                
                <Route path="/Invisibility" element={<Invisibility />} />
                
                <Route path="/online-report" element={<OnlineReport />} />

                {/* A/B test scan pages */}
                <Route path="/scan" element={<ScanRouter />} />
                <Route path="/scan-a" element={<ScanPageA />} />
                <Route path="/scan-b" element={<ScanPageB />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}