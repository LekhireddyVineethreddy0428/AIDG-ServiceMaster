sap.ui.define(
    ["sap/suite/ui/generic/template/lib/AppComponent",
        'sap/ui/model/json/JSONModel',
    ],
    function (Component , JSONModel) {
        "use strict";

        return Component.extend("aidgservicemaster.Component", {
            metadata: {
                manifest: "json"
            },
            init: function () {
     
            },
            onStartUpParams: function (data) {
                debugger;
                let oStartUpModel = new JSONModel()
                let oParams = data.params
                //HANDLING STARTUP PARAMETERS (NAVIGATING FROM MYTASK/NOTIFICATION/DASHBOARD)
                if (oParams) {
                    const oRouter = this.getRouter();
                    const sRouteName = "ZP_QU_DG_SMROOT";
                    const sKeys1 = `s_no=${oParams.SNO},reqid='${oParams.REQID}',asnum='${oParams.MATNR}',IsActiveEntity=${oParams.ISACTIVEENTITY}`;
                    this.pRootControlLoaded.then((oRootView) => {
                        sap.ui.core.BusyIndicator.show(0);
                        let retries = 0;
                        const maxRetries = 200;
                        const intervalMs = 500;

                        const intervalId = setInterval(() => {
                            retries++;
                            const oRoutes = oRouter && oRouter._oRoutes;
                            if (oRoutes && oRoutes[sRouteName]) {
                                clearInterval(intervalId);
                                setTimeout(() => {
                                    sap.ui.core.BusyIndicator.hide();
                                    // sap.suite.ui.generic.template.extensionAPI.navigateInternal(oContext)
                                    oRouter.navTo(sRouteName, { keys1: sKeys1 }, true);
                                }, 500)
                            } else if (retries >= maxRetries) {
                                clearInterval(intervalId);
                                console.error("Route not available after waiting. Navigation aborted.");
                            }
                        }, intervalMs);

                    })
                    oStartUpModel.setData({ params: oParams, isNavigatingFromExternal: true })
                } else {
                    oStartUpModel.setData({ params: null, isNavigatingFromExternal: false })
                }
                this.setModel(oStartUpModel, 'StartUpParamsModel')
            },
        });
    }
);