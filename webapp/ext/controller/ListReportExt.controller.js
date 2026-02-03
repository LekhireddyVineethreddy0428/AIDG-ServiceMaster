sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    'use strict';

    return {
        onInit: function () {
            let oRouter = this.getOwnerComponent().getRouter();
            let oStartUpParamsModel = this.getOwnerComponent().getModel('StartUpParamsModel');
            if (oStartUpParamsModel && oStartUpParamsModel.getData().isNavigatingFromExternal) {
                this.getView().setVisible(false)
            }
        },
        onAfterRendering: function () {
            let oCreateBtn0 = this.getView().byId(this.getView().getId() + '--addEntry-tab0')
            let oCreateBtn1 = this.getView().byId(this.getView().getId() + '--addEntry-tab1')
            let oDeleteBtn0 = this.getView().byId(this.getView().getId() + '--deleteEntry-tab0')
            let oDeleteBtn1 = this.getView().byId(this.getView().getId() + '--deleteEntry-tab1')
            let oCopyBtn1 = this.getView().byId(this.getView().getId() + '--copyButton-tab1')
            oCreateBtn0?.setVisible(false)
            oCreateBtn1?.setVisible(false)
            oDeleteBtn0?.setVisible(false)
            oDeleteBtn1?.setVisible(false)
            oCopyBtn1?.setVisible(false)
        },
        onCreate: async function () {
            let that = this;
            that.getView().setBusy(true)
            try {
                let oApi = this.extensionAPI;
                let aResponse = await oApi.invokeActions("/create_request", [], { reqtyp: 'CREATE' });
                if (aResponse[0] && aResponse[0].response) {
                    let sReqId = aResponse[0].response.response.data.reqid;
                    let oResponseContext = aResponse[0].response.context;
                    this._ContextPath = aResponse[0].response.context.getDeepPath()

                    //OPENING THE DIALOG
                    if (!this.CreateDialog) {
                        this.CreateDialog = sap.ui.xmlfragment(this.getView().getId(), "aidgservicemaster.ext.fragment.Create", this);
                        this.getView().addDependent(this.CreateDialog);
                    }
                    this.CreateDialog.setEscapeHandler(this.onPressEscapeButton.bind(this));



                    //SETTING BINDING CONTEXT
                    this.CreateDialog.setBindingContext(oResponseContext)
                    this.CreateDialog.open();
                    that.getView().setBusy(false)
                }
            } catch (oErr) {
                that.getView().setBusy(false)
                console.error(oErr)
            }
        },
        handleCreate: async function () {
            let that = this;
            let oModel = this.getOwnerComponent().getModel()
            let oSmartForm = this.byId('idCreateSmartForm')
            let oMaterialTypeField = this.byId('create:Mtart')
            let aErrorFields = await oSmartForm.check()

            if (oMaterialTypeField.getProperty('value').length > 0 && aErrorFields.length === 0) {
                this.CreateDialog.setBusy(true)
                let oApi = this.extensionAPI;
                let sPath = this._ContextPath
                let sSno = this.CreateDialog.getBindingContext().getObject().s_no
                let IsActiveEntity = this.CreateDialog.getBindingContext().getObject().IsActiveEntity
                let sReqid = this.CreateDialog.getBindingContext().getObject().reqid
                let sAsnum = this.CreateDialog.getBindingContext().getObject().asnum
                let sReqtyp = this.CreateDialog.getBindingContext().getObject().reqtyp
                let sAstyp = this.CreateDialog.getBindingContext().getObject().astyp
                var oPromise = oApi.invokeActions("/check_screen_and_workflow", [], { s_no: sSno, reqid: sReqid, asnum: sAsnum, reqtyp: sReqtyp, astyp: sAstyp, IsActiveEntity: IsActiveEntity });
                oPromise
                    .then(function (aResponse) {
                        debugger;
                        let sSeverity = JSON.parse(aResponse[0].response.response.headers["sap-message"]).severity;
                        if (sSeverity === "success") {
                            debugger;
                            let oContextToNavigate = new sap.ui.model.Context(oModel, sPath);
                            let oNavController = oApi.getNavigationController();
                            let Reqid = oContextToNavigate.getProperty("reqid");
                            debugger;
                            let oPayload = {
                                astyp: sAstyp,
                                AsnumDisplay: Reqid
                            }

                            oModel.update(sPath, oPayload, {
                                success: function (oData, oResponse) {
                                    that.CreateDialog.setBusy(false)
                                    oModel.read(sPath, {
                                        success: function (oData, oResponse) {
                                            oNavController.navigateInternal(oContextToNavigate);
                                        },
                                        error: function (oErr) {
                                            that.CreateDialog.setBusy(false)
                                            console.error(oErr)
                                        }
                                    });

                                },
                                error: function (oErr) {
                                    that.CreateDialog.setBusy(false)
                                    console.error(oErr)
                                }
                            }
                            );
                        } else {
                            let sErrorMessage = JSON.parse(aResponse[0].response.response.headers["sap-message"]).message;
                            sap.m.MessageBox.error(sErrorMessage);
                            that.CreateDialog.setBusy(false);
                        }

                    })
                    .catch(function (oError) {
                        debugger;
                    })

            } else {
                this.CreateDialog.setBusy(false)
                oMaterialTypeField.setValueState('Error')
            }
        },
        onCloseDialog: function (oEvent) {
            this._DeleteRequest()
            this.CreateDialog.close();
        },

        onPressEscapeButton: function (oEvent) {
            this._DeleteRequest()
            this.CreateDialog.close();
            oEvent.resolve();
        },
        _DeleteRequest: function () {
            debugger;
            let oData = this.CreateDialog.getBindingContext().getObject()
            let oApi = this.extensionAPI;
            let oPromise = oApi.invokeActions("/ZP_QU_DG_SMROOTDiscard", [], {
                s_no: oData.s_no,
                reqid: oData.reqid,
                asnum: '',
                IsActiveEntity: oData.IsActiveEntity
            });
            oPromise.then(() => {

            })
        },
        onBeforeRebindTableExtension: function (oEvent) {
            let sTable2 = this.getView().createId("listReport-tab0");
            let sTable1 = this.getView().createId("listReport-tab1");
            let sTableId = oEvent.getSource().getId()
            if (sTableId === sTable1) {
                oEvent.getParameter("bindingParams").sorter.push(new sap.ui.model.Sorter("DraftEntityLastChangeDateTime", true));
                oEvent.getParameter("bindingParams").sorter.push(new sap.ui.model.Sorter("req_changed_on", true));

            }
        },
        onCopy: async function (oEvent) {
            this.getView().setBusy(true)
            const oModel = this.getView().getModel();
            let that = this;
            let oApi = this.extensionAPI;
            let sMatnr = oApi.getSelectedContexts()[0].getObject().asnum
            let sSno = oApi.getSelectedContexts()[0].getObject().s_no
            let sReqId = oApi.getSelectedContexts()[0].getObject().reqid
            let sReqtyp = "COPY";
            let sMtart = oApi.getSelectedContexts()[0].getObject().astyp
            let IsActiveEntity = oApi.getSelectedContexts()[0].getObject().IsActiveEntity
            var aCheckResponse = await oApi.invokeActions("/check_screen_and_workflow", [], { s_no: sSno, reqid: sReqId, asnum: sMatnr, astyp: sMtart, reqtyp: sReqtyp, IsActiveEntity: IsActiveEntity });
            let sSeverity = JSON.parse(aCheckResponse[0].response.response.headers["sap-message"]).severity;
            if (sSeverity === "success") {
                debugger;
                try {
                    let aResponse = await oApi.invokeActions("/create_request_from_type", [], { s_no: sSno, reqid: sReqId, asnum: sMatnr, astyp: sMtart, reqtyp: sReqtyp, IsActiveEntity: IsActiveEntity });
                    if (aResponse[0] && aResponse[0].response) {
                        let sContextPath = aResponse[0].response.context.getDeepPath()
                        let oContextToNavigate = new sap.ui.model.Context(oModel, sContextPath);
                        let oNavController = this.extensionAPI.getNavigationController()
                        that.getView().setBusy(false)
                        oNavController.navigateInternal(oContextToNavigate);
                    }
                } catch (oErr) {
                    that.getView().setBusy(true)
                    console.log(oErr)
                }
            } else {
                let sErrorMessage = JSON.parse(aCheckResponse[0].response.response.headers["sap-message"]).message;
                sap.m.MessageBox.error(sErrorMessage);
                that.getView().setBusy(false);
            }

        },

    }
});
