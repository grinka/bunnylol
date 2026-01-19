const commands = {
    g: {
        default: true,
        name: 'Google Main Page',
        url: 'https://www.google.com/',
        searchUrl: 'https://www.google.com/search?q=%s'
    },
    ld: {
        name: "LaunchDarkly",
        description: "LaunchDarkly Feature Flags Dashboard",
        url: "https://app.launchdarkly.com/projects/aya/flags?selected-env=integration&env=develop&env=integration&env=production&env=sandbox",
    },
    aya: {
        name: "Aya Pulse Page",
        url: "https://thepulse.ayahealthcare.com/#"
    },
    ticket: {
        name: "Aya Ticketing System",
        description: "Usage: ticket <ticket_number>",
        url: "https://ayadev.atlassian.net/browse/{0}"
    },
    cf: {
        name: "Conflience",
        description: "Usage: cf <search_terms>",
        url: "https://ayadev.atlassian.net/wiki/search?text=%s"
    },
    tcv: {
        prefix: "tcv-",
        name: "Aya Ticketing System - TCV set",
        url: "https://ayadev.atlassian.net/browse/TCV-{0}"
    },
    nova: {
        name: "Nova",
        rules: [
            {
                condition: "{0} == 'prod' || {0} == 'production'",
                url: "https://nova.ayahealthcare.com/",
            },
            {
                condition: "{0} == 'dev' || {0} == 'developent' || {0} == 'develop'",
                url: "https://nova-dev.ayahealthcare.com/",
            },
            {
                condition: "{0} == 'local' || {0} == 'localhost'",
                url: "http://localhost:4201/",
            }
        ],
        url: "https://nova-{0}.ayahealthcare.com/",
        description: "Usage: nova <environment>"
    },
    swagger: {
        name: "Aya Swagger API Docs",
        rules: [
            { 
                condition: "{0} == 'dev' || {0} == 'development' || {0} == 'develop'",
                url: "https://api-dev.ayahealthcare.com/swagger/index.html"
            },
            { 
                condition: "{0} == 'local' || {0} == 'localhost'",
                url: "http://localhost:8088/swagger/index.html"
            }
        ],
        url: "https://api.ayahealthcare.com/swagger/index.html"
    },
    workday: {
        name: "Workday",
        url: "https://wd501.myworkday.com/wday/authgwy/ayahealthcare/login.htmld?returnTo=%2fayahealthcare%2fd%2fhome.htmld",
        description: "Aya Workday Login Page"
    },
    sqlstat: {
        name: "SQL Query Statistics Parser",
        url: "https://statisticsparser.com/",
    },
    'test-command': {
        name: "Test Command",
        rules: [
            { 
                condition: "{0} > 10",
                url: "https://example.com/greater-than-10"
            },
            {
                condition: "{0} <= 10",
                url: "https://example.com/less-equal-10"
            },
            {
                condition: "'{0}' == 'unknown'",
                url: "https://example.com/unknown"
            }
        ],
        url: "https://example.com/default1",
    },
    help: {
        name: "Help - show commands list",
    },
    moneyMovement: {
        name: "Money Movement - Explained",
        prefix: "money-movement",
        url: "https://ayadev.atlassian.net/wiki/spaces/PT/pages/4252959401/Taxable+Nontaxable+fields+and+Stipends+Exception+explained"
    }

};
