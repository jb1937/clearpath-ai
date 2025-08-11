# ClearPath AI - Criminal Record Expungement Eligibility Tool

A comprehensive web application that determines criminal record expungement and sealing eligibility, starting with Washington DC and designed for future expansion to all 50 states.

## 🚀 Features

- **Multi-step Assessment**: Guided 5-step eligibility evaluation
- **Smart Offense Recognition**: Autocomplete search with 200+ DC offenses
- **Advanced Eligibility Engine**: Rule-based analysis of DC criminal record relief laws
- **Comprehensive Results**: Detailed recommendations with next steps
- **Mobile Responsive**: Professional design that works on all devices
- **Accessibility Compliant**: WCAG 2.1 AA standards

## 🏗️ Technical Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Custom CSS design system
- **Routing**: React Router
- **State Management**: Zustand
- **Build Tool**: Vite
- **Deployment**: Vercel

## 🎯 Eligibility Coverage

### Washington DC Relief Options
- **Automatic Expungement**: Marijuana possession (pre-2015), decriminalized offenses
- **Automatic Sealing**: Non-convictions, 10-year waiting period for misdemeanors
- **Motion-based Relief**: Actual innocence expungement, interests of justice sealing
- **Special Programs**: Youth Rehabilitation Act, trafficking survivor relief

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/jb1937/clearpath-ai.git

# Navigate to project directory
cd clearpath-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production
```bash
npm run build
```

## 📁 Project Structure

```
clearpath-ai/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── layout/         # Layout components (Header, Footer, etc.)
│   ├── pages/              # Page components for each step
│   ├── services/           # Business logic (eligibility engine)
│   ├── data/               # Jurisdiction configurations and offense databases
│   ├── store/              # State management
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
└── dist/                   # Production build output
```

## 🔧 Key Components

- **EligibilityEngine**: Core business logic for determining relief options
- **ProgressIndicator**: Multi-step form progress tracking
- **OffenseDatabase**: Comprehensive DC offense classification system
- **FormStore**: Persistent state management across form steps

## 🌟 Future Roadmap

- [ ] Expand to all 50 states
- [ ] PDF report generation
- [ ] Attorney referral integration
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

## ⚖️ Legal Disclaimer

This tool provides preliminary screening only and does not constitute legal advice. Users should consult with qualified attorneys for case-specific guidance.

## 📄 License

Copyright © 2025 ClearPath AI. All rights reserved.

## 🤝 Contributing

This is a private project. For questions or collaboration inquiries, please contact the development team.

---

**Built with ❤️ for criminal justice reform**
