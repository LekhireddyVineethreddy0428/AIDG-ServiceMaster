sap.ui.define([
    "sap/m/MessageToast",
    'sap/ui/model/json/JSONModel',
    "aidgservicemaster/ext/utils/formatter",
], function (MessageToast, JSONModel, formatter,) {
    'use strict';

    return {
        customFormatter: formatter,
        onInit: function () {
            this.extensionAPI.attachPageDataLoaded(this._onPageDataLoad.bind(this))

            //ATTACH CHANGE EVENT TO FIELDS
            this._attachChangeEventToFields();
        },
        _onPageDataLoad: function (oEvent) {
            let sObjectPage = this.getView().getBindingContext().getPath().match(/^\/([^(\s]+)/)?.[1]
            if (sObjectPage === "ZP_QU_DG_SMROOT") {
                let oStartUpParamsModel = this.getOwnerComponent().getModel('StartUpParamsModel');
                if (oStartUpParamsModel && oStartUpParamsModel.getData().params) {
                    const oStartUpParamsModelData = oStartUpParamsModel.getData();
                    this._bIsNavigatingFromExternal = oStartUpParamsModelData?.isNavigatingFromExternal ?? false;
                    this._WorkItemIdExt = oStartUpParamsModelData.params.WIID;
                    this._SequenceExt = oStartUpParamsModelData.params.SEQUENCE;
                    //this.getTheStatusOfRequest();
                    sap.ui.getCore().byId('aidgservicemaster::sap.suite.ui.generic.template.ObjectPage.view.Details::ZP_QU_DG_SMROOT--activate')?.setText('Save');
                } else {
                    this._bIsNavigatingFromExternal = false;
                }

                let sReqTyp = this.getView().getBindingContext().getObject().reqtyp
                if (sReqTyp !== "CREATE_MAS") {
                    const oField = this.byId("GeneralInformationV::astyp::Field");
                    if (oField) {
                        oField.setEditable(false);
                    }
                }
                //GETTING THE WORK ITEM DETAILS
                let sReqid = this.getView().getBindingContext().getProperty('reqid')
                let oMyTaskModel = this.getOwnerComponent().getModel("MyTask")

                oMyTaskModel.read("/ZP_QU_DG_WORKITEMWITHREQUESTS", {
                    urlParameters: {
                        "$skip": 0,
                        "$top": 1,
                    },
                    filters: [new sap.ui.model.Filter("Technical_WorkFlow_Object", "EQ", sReqid)],
                    success: function (oData) {
                        const oItem = oData.results?.[0] || {};
                        this._WorkItemId = oItem.WorkItem_ID;
                        this._TopLevelWiid = oItem.TopLevelWorkflowTask;
                        this._Sequence = oItem.sequence;
                        this._ProcessId = oItem.process_id;
                        this._GetComments(this._TopLevelWiid);
                        this._ManageBottons();
                        this._getattachment();
                    }.bind(this),
                    error: function (oErr) {
                        console.log("Read failed for", sPath, oErr);
                    }.bind(this)
                });


            }
            //this._initServiceMasterSideEffects();
        },

        //_____________Event Handlers_____________//
        _attachChangeEventToFields: function () {
            var oObjectPage = this.getView()
            var aControls = oObjectPage.findAggregatedObjects(true);
            aControls.forEach(function (oControl) {
                if (oControl.attachChange) {
                    oControl.attachChange(this._onFieldChange, this);
                }
            }, this);
        },
        _onFieldChange: function (oEvent) {
        },

        //// Buttons Control /////
        _ManageBottons: function () {
            //BASED ON WORKITEM ID
            if (!this._bIsNavigatingFromExternal) {
                this.getView().byId(this.getView().getId() + '--Approve')?.setVisible(false)
                this.getView().byId(this.getView().getId() + '--Reject')?.setVisible(false)
                this.getView().byId(this.getView().getId() + '--Submit')?.setVisible(false)
                this.getView().byId(this.getView().getId() + '--delete')?.setVisible(false)
                this.getView().byId(this.getView().getId() + '--edit')?.setVisible(false)
                let sReqTyp = this.getView().getBindingContext().getObject().reqtyp
                if (sReqTyp == 'EX') {
                    sap.ui.getCore().byId('aidgservicemaster::sap.suite.ui.generic.template.ObjectPage.view.Details::ZP_QU_DG_SMROOT--objectPage-anchBar-aidgservicemaster::sap.suite.ui.generic.template.ObjectPage.view.Details::ZP_QU_DG_SMROOT--template:::ObjectPageSection:::AfterFacetExtensionSectionWithKey:::sFacet::LT:::sEntitySet::ZP_QU_DG_SMROOT:::sFacetExtensionKey::1-anchor')?.setVisible(false);
                    sap.ui.getCore().byId('aidgservicemaster::sap.suite.ui.generic.template.ObjectPage.view.Details::ZP_QU_DG_SMROOT--template:::ObjectPageSection:::AfterFacetExtensionSubSectionWithKey:::sFacet::LT:::sEntitySet::ZP_QU_DG_SMROOT:::sFacetExtensionKey::1')?.setVisible(false);
                    sap.ui.getCore().byId('aidgservicemaster::sap.suite.ui.generic.template.ObjectPage.view.Details::ZP_QU_DG_SMROOT--action::idshowChanges')?.setVisible(false);
                }
                if (this.getView().getModel('ui').getProperty('/editable') === false) {
                    sap.ui.getCore().byId(this.getView().getId() + '--idUploadSet-uploader-fu_button')?.setVisible(false);
                    sap.ui.getCore().byId(this.getView().getId() + '--idUploadSet-uploadButton')?.setVisible(false);
                    sap.ui.getCore().byId(this.getView().getId() + '--_IDGenFeedInput1-button')?.setVisible(false);
                }
            } else {
                this.getView().byId(this.getView().getId() + '--delete')?.setVisible(false)
                this.getView().byId(this.getView().getId() + '--edit')?.setVisible(false)
                if (this.getView().getModel('ui').getProperty('/editable') === true) {
                    sap.ui.getCore().byId(this.getView().getId() + '--action::idCoustomEdit')?.setVisible(false);
                } else {
                    sap.ui.getCore().byId(this.getView().getId() + '--idUploadSet-uploader-fu_button')?.setVisible(false);
                    sap.ui.getCore().byId(this.getView().getId() + '--idUploadSet-uploadButton')?.setVisible(false);
                    sap.ui.getCore().byId(this.getView().getId() + '--_IDGenFeedInput1-button')?.setVisible(false);
                }

            }
        },

        /// --------------------------------- status and Logs Section------------------------------------------------/// 


        // *****************______________Show log timeline_______________***********************

        onShowLog: function (oEvent) {
            this.getView().setBusy(true);
            this._PrepareLog(oEvent)
        },
        onCloseLog: function () {
            let _oDialogLog = this.getView().byId("idLogs");
            _oDialogLog.close();
            _oDialogLog.destroy();
            _oDialogLog === null;
        },
        _PrepareLog: function (oEvent) {
            let oWorkflowModel = this.getOwnerComponent().getModel("WorkFlowModel");
            let _oDialogLog = this.getView().byId("idLogs");
            if (!_oDialogLog) {
                _oDialogLog = new sap.ui.xmlfragment(this.getView().getId(), "aidgservicemaster.ext.fragment.Logs", this);
                this.getView().addDependent(_oDialogLog);
            }
            let sWorkItemId = this._WorkItemId
            let sReqid = this.getView().getBindingContext().getProperty('reqid')
            oWorkflowModel.read('/WorkflowLogSet', {
                filters: [
                    new sap.ui.model.Filter('WfId', "EQ", sWorkItemId),
                    new sap.ui.model.Filter('Reqid', "EQ", sReqid)],
                success: function (oData, oRes) {
                    let aFilteredData = oData.results.filter((item) => {
                        return item.WiStat !== "PENDING"
                    })
                    this._LogForTimeline(aFilteredData)
                    this.getView().setBusy(false)
                    _oDialogLog.open()
                }.bind(this),
                error: function (oErr) {
                    this.getView().setBusy(false)
                }.bind(this),
            })

        },
        _LogForTimeline: function (aData) {
            var logModel = new sap.ui.model.json.JSONModel();
            logModel.setData({ "LogCollection": aData });
            this.getView().byId("logList").setModel(logModel, "logModel");
        },

        // ****************_______________Show Status Graph________________***************

        onShowStatus: function (oEvent) {
            this.getView().setBusy(true);
            this._PrepareStatusLog(oEvent)
        },
        onCloseStatusLog: function () {
            let _oDialogStatusLog = this.getView().byId("idStatusLogs")
            _oDialogStatusLog.close();
            _oDialogStatusLog.destroy();
            _oDialogStatusLog === null;
        },
        _PrepareStatusLog: function (oEvent) {
            let oWorkflowModel = this.getOwnerComponent().getModel("WorkFlowModel");

            let sWorkItemId = this._WorkItemId;
            let sReqid = this.getView().getBindingContext().getProperty('reqid')

            //LOG FOR STATUS --- NETWORK GRAPH
            let _oDialogStatusLog = this.getView().byId("idStatusLogs");
            if (!_oDialogStatusLog) {
                _oDialogStatusLog = new sap.ui.xmlfragment(this.getView().getId(), "aidgservicemaster.ext.fragment.StatusLog", this);
                this.getView().addDependent(_oDialogStatusLog);
            }
            debugger

            oWorkflowModel.read('/WorkflowLogSet', {
                filters: [
                    new sap.ui.model.Filter('WfId', "EQ", sWorkItemId),
                    new sap.ui.model.Filter('Reqid', "EQ", sReqid),],
                success: function (oData, oRes) {
                    this._LogForGraph(oData.results)
                    this.getView().setBusy(false)
                    _oDialogStatusLog.open()
                }.bind(this),
                error: function (oErr) {
                    this.getView().setBusy(false)
                }.bind(this),
            })
        },
        _LogForGraph: function (aData) {
            let aLogData = aData
            const seenSequences = new Set();
            const aFilteredData = [];

            for (let i = aLogData.length - 1; i >= 0; i--) {
                if (!seenSequences.has(aLogData[i].Sequence)) {
                    seenSequences.add(aLogData[i].Sequence);
                    aFilteredData.push(aLogData[i]);
                }
            }

            //aFilteredData.reverse(); // Restore original order
            debugger;
            let aNodes = aFilteredData
            let aLines = []
            aFilteredData.forEach(item => {
                const { Sequence, Preceeding_seq } = item;
                if (Sequence === 'START') {
                    aLines.push({ from: 'START', to: '1-1', lineType: 'Dotted' });
                }
                const predecessors = Preceeding_seq.split('&');
                predecessors.forEach(predecessor => {
                    if (predecessor !== "0-0" && predecessor !== "") {
                        aLines.push({ from: predecessor, to: Sequence });
                    }
                });
            });

            //IF IT IS REJECTED, THEN ALL OTHER NODES STATUS SHOULD CHANGE TO PENDING
            // aNodes.forEach(item => {
            //     if (aNodes.some(obj => obj.Sequence === "1-1" && obj.WiStat === "READY")) {
            //         if (item.Sequence !== "1-1" && item.Sequence !== "START") {
            //             item.WiStat = "PENDING";
            //         }
            //     }
            // });

            function markPending(seq) {
                aNodes.forEach(item => {
                    if (
                        item.Sequence !== "START" &&
                        item.Preceeding_seq &&
                        item.Preceeding_seq.split("&").includes(seq)
                    ) {
                        if (item.WiStat !== "READY") {
                            item.WiStat = "PENDING";
                            markPending(item.Sequence); // recurse further
                        }
                    }
                });
            }

            // If node is READY, mark successors as PENDING
            aNodes.forEach(item => {
                if (item.Sequence !== "START" && item.WiStat === "READY") {
                    markPending(item.Sequence);
                }
            });


            //MAKE DATE AS NULL IF THE STATUS IS READY
            aNodes.forEach(item => {
                if (item.WiStat === 'READY') {
                    item.WiAed = null;
                    item.WiCt = null;
                }
            });
            const oGraphData = {
                nodes: aNodes,
                lines: aLines
            };
            debugger;
            var oNetworkModel = new sap.ui.model.json.JSONModel(oGraphData);
            this.byId('networkGraph').setModel(oNetworkModel, 'StatusLogModel')

        },
        onAfterLayouting: function (oEvent) {
            let aNodes = oEvent.getSource().getNodes()
            aNodes.forEach((node) => {
                if (node.getStatus() === 'Standard') {
                    debugger;
                    node.addStyleClass('myDisabledNode')
                }
            })

        },
        onManageRoles: function (oEvent) {
            debugger;
            let oSelectedNodeContext = oEvent.getSource().getBindingContext("StatusLogModel")
            let oSelectedNode = oSelectedNodeContext.getObject()
            let aFilters = [
                new sap.ui.model.Filter("ProcessId", "EQ", this._ProcessId),
                new sap.ui.model.Filter("StepId", "EQ", oSelectedNode.Step_Id),
                new sap.ui.model.Filter("AssignedRole", "NE", ''),
            ]
            this.loadFragment({
                name: "aidgservicemaster.ext.fragment.ManageRolesUsers"
            }).then((oDialog) => {
                this._oPopOverManageRoles = oDialog;
                this._oPopOverManageRoles.setModel(this.getOwnerComponent().getModel('ZP_QU_DG_PRO_STEP_ROLE_CDS'))
                let oList = this.getView().byId("idSmartListRoles")
                let oCustomData = new sap.ui.core.CustomData({
                    key: "filterObject",
                    value: aFilters
                });
                oList.addCustomData(oCustomData);
                oList.rebindList()
                this._oPopOverManageRoles.openBy(oEvent.getSource());
                //initilise the users page
                this.getView().byId("idUsersPage").addEventDelegate({
                    onBeforeShow: function (oEvent) {
                        let sRole = oEvent.data.AssignedRole
                        let sStepId = oEvent.data.StepId
                        let oSmartList = this.getView().byId('idSmartListUsers')
                        oSmartList.addCustomData(
                            new sap.ui.core.CustomData({
                                key: "role",
                                value: sRole,
                            })
                        );
                        oSmartList.addCustomData(
                            new sap.ui.core.CustomData({
                                key: "stepId",
                                value: sStepId,
                            })
                        );
                        oSmartList.rebindList()
                    }.bind(this),

                });
            });

        },
        onBeforeRebindList: function (oEvent) {
            if (oEvent.getSource().getId() === this.getView().getId() + '--idSmartListRoles') {
                let aFilter = oEvent.getSource().getCustomData()[0].getValue()
                oEvent.getParameter("bindingParams").filters = aFilter
            } else if (oEvent.getSource().getId() === this.getView().getId() + '--idSmartListUsers') {
                let oCustomRoleData = oEvent.getSource().getCustomData().find((data) => data.getKey() === "role")
                let oCustomStepData = oEvent.getSource().getCustomData().find((data) => data.getKey() === "stepId")
                if (oCustomRoleData && oCustomStepData) {
                    let sRole = oCustomRoleData.getValue()
                    let sStepId = oCustomStepData.getValue()
                    oEvent.getParameter("bindingParams").filters = [new sap.ui.model.Filter("RoleName", "EQ", sRole), new sap.ui.model.Filter("StepId", "EQ", sStepId)]
                }
            }

        },
        handleClosePopOver: function (oEvent) {
            if (this._oPopOverManageRoles) {
                this._oPopOverManageRoles.close()
            }
        },
        handleOnAfterPopOverClose: function (oEvent) {
            if (this._oPopOverManageRoles) {
                this._oPopOverManageRoles.destroy()
                this._oPopOverManageRoles = null
            }
        },
        handleNavigation: function (oEvent) {
            let oBindingContext = oEvent.getSource().getBindingContext()
            let navCon = this.getView().byId("navCon");
            if (oBindingContext) {
                let oUserspage = this.getView().byId('idUsersPage')
                navCon.to(oUserspage, oBindingContext.getObject());
            } else {
                navCon.back();
            }
        },

        /// ----------------------------buttons section-----------------------------------------------------//

        // ****************_______________WITHDRAW________________***************
        onWithdraw: function () {
            let that = this;
            sap.m.MessageBox.confirm("Are you sure you want to Withdraw the request?", {
                icon: sap.m.MessageBox.Icon.WARNING,
                title: "Withdraw Request..?",
                onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.OK) {
                        that.getView().setBusy(true);
                        let oApi = that.extensionAPI;
                        let WiId = that._WorkItemId


                        let oData = that.getView().getBindingContext().getObject()
                        let oPayload = {
                            s_no: oData.s_no,
                            reqid: oData.reqid,
                            asnum: oData.asnum,
                            IsActiveEntity: oData.IsActiveEntity,
                            WiId: WiId,
                            Step: "1"
                        }

                        let oPromise = oApi.invokeActions("/withdraw", [], oPayload);
                        oPromise
                            .then(function (aResponse) {
                                that.getView().setBusy(false);
                                window.history.go(-1);
                            })
                            .catch(function (oErr) {
                                that.getView().setBusy(false);
                                sap.m.MessageToast.show('Something went wrong...!!!')
                                console.log(oErr)
                            });

                    }
                }
            });
        },

        // ****************_______________UPDATE________________***************
        onUpdate: async function (oEvent) {
            this.getView().setBusy(true)
            const oModel = this.getView().getModel();
            let that = this;
            let oApi = this.extensionAPI;
            let sMatnr = this.getView().getBindingContext().getProperty().asnum
            let sSno = this.getView().getBindingContext().getProperty().s_no
            let sReqId = this.getView().getBindingContext().getProperty().reqid
            let sReqtyp = "UPDATE";
            let sMtart = this.getView().getBindingContext().getProperty().astyp
            let IsActiveEntity = this.getView().getBindingContext().getProperty().IsActiveEntity
            var aCheckResponse = await oApi.invokeActions("/check_screen_and_workflow", [], { s_no: sSno, reqid: sReqId, asnum: sMatnr, astyp: sMtart, reqtyp: sReqtyp, IsActiveEntity: IsActiveEntity });
            let sSeverity = JSON.parse(aCheckResponse[0].response.response.headers["sap-message"]).severity;
            if (sSeverity === "success") {
                debugger;
                try {
                    let aResponse = await oApi.invokeActions("/create_request_from_type", [], { s_no: sSno, reqid: sReqId, asnum: sMatnr, astyp: sMtart, reqtyp: sReqtyp, IsActiveEntity: IsActiveEntity });
                    debugger;
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

        // ****************_______________DELETE________________***************
        onDelete: async function (oEvent) {
            const oApi = this.extensionAPI;
            const oContext = this.getView().getBindingContext();
            const sButtonId = oEvent.getSource().getId();

            this._sCurrentReqTyp = sButtonId.includes("idUnDeleteButton") ? "UNDELETE" : "DELETE";

            let sMatnr = oContext.getProperty("asnum");
            let sSno = oContext.getProperty("s_no");
            let sReqId = oContext.getProperty("reqid");
            let sMtart = oContext.getProperty("astyp");
            let IsActiveEntity = oContext.getProperty("IsActiveEntity");

            try {
                let aCheckResponse = await oApi.invokeActions(
                    "/check_screen_and_workflow",
                    [],
                    {
                        s_no: sSno,
                        reqid: sReqId,
                        asnum: sMatnr,
                        astyp: sMtart,
                        reqtyp: this._sCurrentReqTyp,
                        IsActiveEntity: IsActiveEntity
                    }
                );

                let oSapMessage = JSON.parse(
                    aCheckResponse[0].response.response.headers["sap-message"]
                );

                if (oSapMessage.severity === "success") {
                    let aResponse = await oApi.invokeActions(
                        "/create_request_from_type",
                        [],
                        {
                            s_no: sSno,
                            reqid: sReqId,
                            asnum: sMatnr,
                            astyp: sMtart,
                            reqtyp: this._sCurrentReqTyp,
                            IsActiveEntity: IsActiveEntity
                        }
                    );

                    if (aResponse[0] && aResponse[0].response) {
                        if (!this._pDialog) {
                            this._pDialog = this.loadFragment({
                                name: "aidgservicemaster.ext.fragment.Delete"
                            });
                        }

                        const oDialog = await this._pDialog;
                        oDialog.setBusy(false);
                        oDialog.open();
                    }
                } else {
                    // sap.m.MessageBox.error(oSapMessage.message);
                }
            } catch (oErr) {
                console.error(oErr);
            }
        },

        onDeleteCloseDialog: async function () {
            const oDialog = await this._pDialog;
            oDialog.close();
        },

        handleDelete: async function () {
            const oView = this.getView();
            const oModel = oView.getModel();
            const oContext = oView.getBindingContext();

            let sMatnr = oContext.getProperty("asnum");
            let sSno = oContext.getProperty("s_no");
            let sReqId = oContext.getProperty("reqid");
            let IsActiveEntity = oContext.getProperty("IsActiveEntity");

            const oDialog = await this._pDialog;
            const oDialogContext = oDialog.getBindingContext();

            let sReqPriority = oDialogContext.getProperty("reqprio");
            let sReqDescription = oDialogContext.getProperty("req_desc");

            var oPayload = {
                s_no: sSno,
                reqid: sReqId,
                asnum: sMatnr,
                IsActiveEntity: IsActiveEntity,
                reqtyp: this._sCurrentReqTyp,
                ReqPriority: sReqPriority,
                ReqDescription: sReqDescription
            };

            oDialog.setBusy(true);
            oModel.callFunction("/create_delete_undelete_request", {
                method: "POST",
                urlParameters: oPayload,
                success: function (oData) {
                    oDialog.setBusy(false);
                    this.onDeleteCloseDialog();
                    let sPath = oModel.createKey("/ZP_QU_DG_SMROOT", {
                        s_no: oData.s_no,
                        reqid: oData.reqid,
                        asnum: oData.asnum,
                        IsActiveEntity: oData.IsActiveEntity
                    });
                    let oContextToNavigate = new sap.ui.model.Context(oModel, sPath);
                    let oNavController = this.extensionAPI.getNavigationController();
                    oNavController.navigateInternal(oContextToNavigate);
                }.bind(this),
                error: function (oError) {
                    oDialog.setBusy(false);
                    var sMessage = JSON.parse(oError.responseText)
                        .error.message.value;
                    sap.m.MessageBox.error(sMessage);
                }
            });
        },
        // ****************_______________APPROVE________________***************
        onApprove: function (oEvent, ApporveStatus) {
            debugger
            let that = this;
            let oApi = this.extensionAPI;
            let asnum = this.getView().getBindingContext().getProperty().asnum;
            let reqid = this.getView().getBindingContext().getProperty().reqid;
            let s_no = this.getView().getBindingContext().getProperty().s_no;
            let IsActiveEntity = this.getView().getBindingContext().getProperty().IsActiveEntity;
            let step = this._SequenceExt;
            let wi_id = this._WorkItemIdExt;
            let Status = ApporveStatus;

            if (Status === null || Status === undefined) {
                Status = false;
            }

            var oPromise = oApi.invokeActions("/approve", [], { s_no: s_no, reqid: reqid, asnum: asnum, WiId: wi_id, Step: step, IsActiveEntity: IsActiveEntity, IsAllApprove: Status });
            oPromise
                .then(function (aResponse) {
                    debugger;
                    let successMessage = JSON.parse(aResponse[0].response.response.headers["sap-message"]).message;
                    sap.m.MessageBox.show(successMessage, {
                        icon: sap.m.MessageBox.Icon.SUCCESS,
                        title: "SUCCESS",
                        actions: [sap.m.MessageBox.Action.OK],
                        emphasizedAction: sap.m.MessageBox.Action.OK,
                        onClose: function (oAction) {
                            debugger;
                            if (oAction === sap.m.MessageBox.Action.OK) {
                                that._bIsNavigatingFromExternal ? sap.ui.getCore().navigateExternal('mytasknew.mytasknew', '', {}) : window.history.go(-1)
                            }
                        }
                    });
                })
                .catch(function (oError) {
                    that.getView().setBusy(false);
                    sap.m.MessageToast.show(oError);
                });

        },

        //*************** Check Double Request In MY Task For the Approving  *****************/

        onCheckMyTask: function (oEvent,bSubmit) {
            const oView = this.getView();
            const oContext = oView.getBindingContext().getProperty();
            const sReqId = oContext.reqid;
            const { s_no, asnum, IsActiveEntity } = oContext;
            let oApi = this.extensionAPI;
            let step = this._SequenceExt;
            let wi_id = this._WorkItemIdExt;

            const oFilter = new sap.ui.model.Filter("Technical_WorkFlow_Object", sap.ui.model.FilterOperator.EQ, sReqId);
            oView.setBusy(true);
            const fnValidateAndApprove = (bIsAllApprove) => {
                const oPayload = {
                    s_no,
                    reqid: sReqId,
                    asnum,
                    WiId: wi_id,
                    Step: step,
                    IsActiveEntity,
                    IsAllApprove: bIsAllApprove
                };

                oApi.invokeActions("/check_step_based_mandatory", [], oPayload)
                    .then((aResponse) => {
                        oView.setBusy(false);
                        try {
                            const sHeader = aResponse[0]?.response?.response?.headers["sap-message"];
                            const oSapMessage = sHeader ? JSON.parse(sHeader) : {};

                            if (oSapMessage.severity === "success") {
                                this.onApprove(oEvent, bIsAllApprove);
                            } else {
                                sap.m.MessageBox.error(oSapMessage.message || "Mandatory fields missing.");
                            }
                        } catch (e) {
                            sap.m.MessageToast.show("Error parsing validation response.");
                        }
                    })
                    .catch((oError) => {
                        oView.setBusy(false);
                        sap.m.MessageToast.show("Validation service failed.");
                    });
            };

            // --- MAIN LOGIC FLOW ---
            if (bSubmit === true) {
                const oModel = this.getOwnerComponent().getModel("ZP_QU_DG_MYTASK_BND");
                // Step 1: Check for duplicates
                oModel.read("/ZP_QU_DG_MYTASK", {
                    filters: [oFilter],
                    success: (oData) => {
                        const aItems = oData.results || [];

                        if (aItems.length > 1) {
                            // Multiple steps: Ask user, then Validate
                            const sSteps = aItems.map(item => `• ${item.sequence}`).join("\n");
                            oView.setBusy(false);

                            sap.m.MessageBox.warning(`Multiple approvals found for request: ${sReqId}\n\nSteps:\n${sSteps}\n\nDo you want to proceed all at once?`, {
                                title: "Multiple Approvals Detected",
                                actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                                onClose: (oAction) => {
                                    oView.setBusy(true);
                                    let ApporveStatus
                                    if (oAction === sap.m.MessageBox.Action.YES) {
                                        ApporveStatus = true;
                                        fnValidateAndApprove(ApporveStatus)
                                    } else {
                                        ApporveStatus = false;
                                        fnValidateAndApprove(ApporveStatus)
                                    }
                                }
                            });
                        } else {
                            // No duplicates: Bypass check and Approve directly as False
                            oView.setBusy(false);
                            this.onApprove(oEvent, false);
                        }
                    },
                    error: (oError) => {
                        oView.setBusy(false);
                        sap.m.MessageToast.show("Failed to check for duplicate tasks.");
                    }
                });
            } else {
                // bSubmit is false: Immediately validate with IsAllApprove = false
                fnValidateAndApprove(false);
            }
        },

        // ****************_______________SUBMIT________________***************
        onSubmit: function (oEvent) {
            if (this.getView().getModel('ui').getProperty('/editable') === true) {
                sap.m.MessageToast.show("Save the data before submitting");
                return
            }
            let that = this;
            sap.m.MessageBox.show("Submit Request?", {
                title: 'Are you sure want to Submit',
                actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                emphasizedAction: sap.m.MessageBox.Action.OK,
                onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.OK) {
                        let Submit = true;
                        that.onCheckMyTask(oEvent,Submit);
                    }
                }
            });
        },

        ///****************_______________EDIT_____________________**************
        onEdit: async function () {
            debugger;
            let oApi = this.extensionAPI;
            let oContext = this.getView().getBindingContext();
            let oModel = this.getOwnerComponent().getModel()
            let { reqid, asnum, s_no, IsActiveEntity } = oContext.getObject();
            let step_name = this._SequenceExt;
            let stepname = String(step_name || '').replace(/-/g, '');
            let wi_id = this._WorkItemId;

            try {
                // --- CALL 1: Check Lock Status of Draft  ---
                let statusCheck = await oApi.invokeActions("/custom_edit_status", [], {
                    s_no: s_no, reqid: reqid, asnum: asnum, IsActiveEntity: IsActiveEntity, WiId: wi_id, Step: stepname
                });

                let lockData = statusCheck[0].response.data.custom_edit_status;
                if (lockData.Username === '') {
                    if (lockData.CreateNew == true) {
                        // --- CALL 2: Trigger Edit and Extract URI ---
                        let editResponse = await oApi.invokeActions("/ZP_QU_DG_SMROOTEdit", [], {
                            PreserveChanges: true,
                            s_no: s_no,
                            reqid: reqid,
                            asnum: asnum,
                            IsActiveEntity: IsActiveEntity,
                            PreserveChanges: true
                        });
                        let sUriFromSecondCall = editResponse[0].response.data;
                        // --- CALL 3: Final Custom Action using data from Call 2 ---
                        if (sUriFromSecondCall) {
                            let navigateResponse = await oApi.invokeActions("/custom_edit", [], {
                                s_no: sUriFromSecondCall.s_no,
                                reqid: sUriFromSecondCall.reqid,
                                asnum: sUriFromSecondCall.asnum,
                                IsActiveEntity: sUriFromSecondCall.IsActiveEntity,
                                WiId: wi_id,
                                Step: stepname,

                            });
                            let response = navigateResponse[0].response.data.custom_edit;
                            let sComponent = 'aidgservicemaster'
                            let oParams = {
                                REQID: response.Reqid,
                                SNO: response.SNo,
                                MATNR: response.Asnum,
                                ISACTIVEENTITY: response.Isactiveentity,
                                WIID: wi_id,
                                SEQUENCE: step_name
                            }

                            sap.ui.getCore().navigateExternal(sComponent, '', { params: oParams });
                        }
                    } else {
                        let sComponent = 'aidgservicemaster'
                        let oParams = {
                            REQID: lockData.Reqid,
                            SNO: lockData.SNo,
                            MATNR: lockData.Asnum,
                            ISACTIVEENTITY: lockData.Isactiveentity,
                            WIID: wi_id,
                            SEQUENCE: step_name
                        }
                        sap.ui.getCore().navigateExternal(sComponent, '', { params: oParams });
                    }

                } else {
                    return sap.m.MessageBox.error("Record is being Edited by " + lockData.Username);
                }
            } catch (oError) {
                console.log("Action Chain Failed: ", oError);
                sap.m.MessageBox.error("An error occurred during the update process...");
            }
        },

        // ****************_______________REJECT________________***************
        onReject: function (oEvent) {
            sap.ui.core.BusyIndicator.show(0)
            var oModel = this.getOwnerComponent().getModel("ZP_QU_DG_MYTASK_BND")
            let sequence = this._Sequence
            let reqid = this.getView().getBindingContext().getProperty().reqid;

            oModel.read(`/ZI_QU_DG_RejctionVH(iv_reqid='${reqid}',iv_sequence='${sequence}')/Set`, {
                success: function (oData) {
                    let oJsonModel = new sap.ui.model.json.JSONModel(oData.results)
                    this.getView().setModel(oJsonModel, "oRejModel")

                    if (!this._rejectDialog) {
                        this.loadFragment({
                            name: "aidgservicemaster.ext.fragment.Reject"
                        }).then(function (oDialog) {
                            this._rejectDialog = oDialog;
                            this._rejectDialog.open();
                            sap.ui.core.BusyIndicator.hide()
                        }.bind(this));
                    } else {
                        // Re-open the dialog if it already exists
                        this._rejectDialog.open();
                        sap.ui.core.BusyIndicator.hide()
                    }
                }.bind(this),
                error: function (oErr) {
                    sap.ui.core.BusyIndicator.hide()
                }
            })
        },
        onCancel: function () {
            if (this._rejectDialog) {
                this._rejectDialog.close();
                this._rejectDialog.destroy();
                this._rejectDialog = null;
            }
        },
        onStepSelectionChange: function (oEvent) {
            var oMultiCombo = oEvent.getSource();
            var aSelectedKeys = oMultiCombo.getSelectedKeys();
            var aAllItems = oMultiCombo.getItems();
            if (aSelectedKeys.length === 0) {
                aAllItems.forEach(item => item.setEnabled(true));
                return;
            }
            var sFirstKey = aSelectedKeys[0];
            var sAllowedGroup = sFirstKey.split("-")[0];
            aAllItems.forEach(function (oItem) {
                var sItemKey = oItem.getKey();
                var sItemGroup = sItemKey.split("-")[0];
                if (sItemGroup === sAllowedGroup) {
                    oItem.setEnabled(true);
                } else {
                    oItem.setEnabled(false);
                }
            });
        },

        onConfirmReject: async function () {
            debugger;
            let that = this;
            let oCommentInput = this.getView().byId('idRejectComment');
            let oComboBox = this.getView().byId("idrejectip");
            let bValid = true;
            if (!oCommentInput.getValue()) {
                oCommentInput.setValueState("Error");
                oCommentInput.setValueStateText("Please add comment to proceed...!!!");
                bValid = false;
            } else {
                oCommentInput.setValueState("None");
            }

            let aSelectedSteps = oComboBox.getSelectedKeys();
            if (aSelectedSteps.length === 0) {
                oComboBox.setValueState("Error");
                oComboBox.setValueStateText("Please select at least one step.");
                bValid = false;
            } else {
                oComboBox.setValueState("None");
            }

            if (!bValid) return;

            try {
                this._rejectDialog.setBusy(true);
                let sRejectionComment = oCommentInput.getValue();

                let rejectInputValue = aSelectedSteps.toString();

                let oApi = this.extensionAPI;
                let oData = this.getView().getBindingContext().getProperty();
                let wi_id = this._WorkItemIdExt;
                let topLevelWiId = this._TopLevelWiid;

                let aResponse = await oApi.invokeActions("/reject", [], {
                    s_no: oData.s_no,
                    reqid: oData.reqid,
                    asnum: oData.asnum,
                    IsActiveEntity: oData.IsActiveEntity,
                    WiId: wi_id,
                    Step: rejectInputValue
                });

                if (this._rejectDialog) {
                    this._rejectDialog.close();
                    this._rejectDialog.destroy();
                    this._rejectDialog = null;
                }

                let sLoggedInUser = this.getView().getBindingContext().getObject()?.user_name;
                let oCommentModel = this.getOwnerComponent().getModel('ZQU_DG_ATTACHMENT_COMMENT_SRV');
                let oPayload = {
                    InstanceId: topLevelWiId,
                    Id: "",
                    Filename: "USER COMMENTS",
                    Text: sRejectionComment,
                    CreatedAt: new Date(),
                    CreatedBy: sLoggedInUser,
                };

                await new Promise((resolve, reject) => {
                    oCommentModel.create("/TaskSet('" + topLevelWiId + "')/TaskToComments", oPayload, {
                        success: resolve,
                        error: reject
                    });
                });

                let rejectMessage = JSON.parse(aResponse[0].response.response.headers["sap-message"]).message;
                sap.m.MessageBox.success(rejectMessage, {
                    onClose: function () {
                        that._bIsNavigatingFromExternal ? sap.ui.getCore().navigateExternal('mytasknew.mytasknew', '', {}) : window.history.go(-1);
                    }
                });

            } catch (oError) {
                sap.m.MessageToast.show("Rejection failed, please try again.");
                console.log("Error:", oError);
            } finally {
                if (this._rejectDialog) {
                    this._rejectDialog.setBusy(false);
                }
            }
        },
        onDuplicateCheck: function (oEvent) {
            this.getView().setBusy(true);

            const oModel = this.getView().getModel();
            let oData = this.getView().getBindingContext().getObject()
            this.getView().setModel(new sap.ui.model.json.JSONModel([oData]), "currentRecord")
            debugger;
            var mParameters = {
                s_no: oData.s_no,
                reqid: oData.reqid,
                asnum: oData.asnum,
                IsActiveEntity: oData.IsActiveEntity
            };

            oModel.callFunction("/check_duplicate", {
                method: "POST",
                urlParameters: mParameters,
                success: function (oData, response) {
                    this.getView().setBusy(false)
                    if (oData.results.length === 0) {
                        MessageToast.show("No Duplicates Available");
                        return;
                    }
                    const duplicateModel = new sap.ui.model.json.JSONModel(oData.results);
                    this.getView().setModel(duplicateModel, "duplicateModel");
                    if (!this.duplicateFragment) {
                        this.duplicateFragment = sap.ui.xmlfragment("aidgservicemaster.ext.fragment.DuplicateCheck", this);
                        this.getView().addDependent(this.duplicateFragment);
                    }
                    this.duplicateFragment.open();
                }.bind(this),
                error: function (oError) {
                    this.getView().setBusy(false)
                    MessageToast.show("Error calling function import", oError);
                }.bind(this),
            });
        },
        onCloseDuplicateCheck: function () {
            this.duplicateFragment.close();
        },
        onIgnoreDuplicates: function () {
            let sPath = this.getView().getBindingContext().getPath();
            let oModelData = this.getView().getModel();
            if (oModelData.getProperty(sPath + "/dupindicator") === false) {
                oModelData.setProperty(sPath + "/dupindicator", true);
                sap.m.MessageToast.show("Potential duplicates Ignored");
            }
            else {
                oModelData.setProperty(sPath + "/dupindicator", false);
                sap.m.MessageToast.show("Potential duplicates will be checked");
            }
            this.duplicateFragment.close();
        },

        /////// Comments and Attachments //////////

        //___________________________ATTACHMENTS_________________________
        _getattachment: function () {
            let oModel = this.getOwnerComponent().getModel("CV_ATTACHMENT_SRV");
            let sReqid = this.getView().getBindingContext().getProperty('reqid')
            oModel.read("/GetAllOriginals", {
                urlParameters: {
                    "ObjectType": "'BUS1006'",
                    "ObjectKey": `'${sReqid}'`,
                    "SemanticObjectType": "''",
                    "IsDraft": false,
                    "AttachmentFramework": "''"
                },
                success: function (oData, oRes) {
                    debugger
                    this.getView().setModel(new sap.ui.model.json.JSONModel(oData.results), "attachmentDetail");
                }.bind(this),
                error: function (oErr) {
                    debugger
                    console.log(oErr);
                }
            });
        },
        //___________________________COMMENTS_________________________

        _GetComments: async function (TopLevelWorkItemId) {
            let oCommentLayout = this.getView().byId('id:CommentBox')
            oCommentLayout.setBusy(true)
            let oCommentModel = this.getOwnerComponent().getModel('ZQU_DG_ATTACHMENT_COMMENT_SRV');
            let aAllCommentsList = [];

            // Get comments from local context
            let aCommentsData = this.getView().getBindingContext()?.getProperty('user_comment');
            if (aCommentsData) {
                try {
                    aAllCommentsList = aAllCommentsList.concat(JSON.parse(aCommentsData));
                } catch (e) {
                    console.warn("Failed to parse user_comment JSON:", e);
                }
            }

            // Read comments from backend
            try {
                let backendComments = await new Promise((resolve, reject) => {
                    oCommentModel.read("/TaskSet('" + TopLevelWorkItemId + "')/TaskToComments", {
                        success: function (oData) {
                            resolve(oData.results);
                        },
                        error: function (oError) {
                            reject(oError);
                        }
                    });
                });

                aAllCommentsList = aAllCommentsList.concat(backendComments);
                this._SetCommentsModel(aAllCommentsList);

            } catch (error) {
                // sap.m.MessageToast.show("Error Reading Comments data..!!");
                console.log("Error fetching backend comments:", error);
            } finally {
                oCommentLayout.setBusy(false)
            }
        },
        _SetCommentsModel: function (aComments) {
            if (aComments.length > 0) {
                let aActions = [{
                    "Text": "Delete",
                    "Icon": "sap-icon://delete",
                    "Key": "DELETE"
                }];

                for (var count = 0; count < aComments.length; count++) {
                    if (aComments[count].Delete === "X") {
                        aComments[count].Actions = aActions;
                    }
                    else {
                        aComments[count].Actions = [];
                    }

                }
            }
            let localModel = new sap.ui.model.json.JSONModel();
            localModel.setData({ "EntryCollection": aComments });
            this.getView().setModel(localModel, "localCommentModel");
        },


        //______________________________Show Changes _____________________________
        onShowChanges: async function (oEvent) {
            const oView = this.getView();
            oView.setBusy(true);

            try {
                if (!oEvent) {
                    oView.setBusy(false);
                    return;
                }
                if (!this.showChangesFragment) {
                    this.showChangesFragment = await this._loadFragment();
                    if (!this.showChangesFragment) {
                        throw new Error("Fragment creation failed");
                    }
                }

                // Load data BEFORE opening dialog
                await this.getDataonShowchanges();

                // Open dialog
                if (this.showChangesFragment && this.showChangesFragment.open) {
                    this.showChangesFragment.open();
                }

            } catch (oError) {
                oView.setBusy(false);
                console.error("Error in onShowChanges:", oError);
                sap.m.MessageBox.error(oError.message || "An error occurred", {
                    title: "Error"
                });
                return; // Add return to prevent finally from overriding error state
            } finally {
                oView.setBusy(false);
            }
        },

        _loadFragment: function () {
            return new Promise((resolve, reject) => {
                try {
                    const oFragment = sap.ui.xmlfragment(
                        "aidgservicemaster.ext.fragment.showChanges",
                        this
                    );

                    if (oFragment) {
                        this.getView().addDependent(oFragment);
                        resolve(oFragment);
                    } else {
                        reject(new Error("Fragment creation returned null"));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        },

        onCloseshowChanges: function () {
            if (this.showChangesFragment?.close) {
                this.showChangesFragment.close();
            }
        },

        getDataonShowchanges: function () {
            return new Promise(function (resolve, reject) {
                const oModel = this.getOwnerComponent().getModel();
                let sReqid = this.getView().getBindingContext().getProperty('reqid');

                // Check if the OData model is properly loaded
                if (!oModel) {
                    reject(new Error("OData Model not found."));
                    return;
                }
                let sPath = "/ZI_QU_DG_SM_GETCHANGELOG(reqid='" + sReqid + "')/Set";
                oModel.read(sPath, {
                    success: function (oData) {
                        var oJSONModel = this.getView().getModel("localReqLog");

                        // Create JSON model if it doesn't exist
                        if (!oJSONModel) {
                            oJSONModel = new sap.ui.model.json.JSONModel();
                            this.getView().setModel(oJSONModel, "localReqLog");
                        }

                        // Set the data to the model
                        oJSONModel.setData(oData.results || []);
                        resolve(oData);
                    }.bind(this),
                    error: function (oErr) {
                        console.error("Read failed:", oErr);
                        reject(oErr);
                    }.bind(this)
                });
            }.bind(this));
        },

        getTheStatusOfRequest: function () {
            let oModel = this.getView().getModel();
            let uri = window.location.href;
            let match = uri.match(/\(([^)]+)\)/);

            if (match && match[1]) {
                let sKeyString = match[1];
                let oParams = {};

                sKeyString.split(",").forEach(function (item) {
                    let aPair = item.split("=");
                    let sKey = aPair[0];
                    let sValue = aPair[1].replace(/'/g, "");

                    if (sValue === "true") sValue = true;
                    else if (sValue === "false") sValue = false;
                    else if (!isNaN(sValue) && sValue !== "") sValue = parseInt(sValue);

                    oParams[sKey] = sValue;
                });

                let sPath = oModel.createKey("/ZP_QU_DG_SMROOT", oParams);

                oModel.read(sPath, {
                    success: function (oData) {
                        console.log("Entity exists.");
                    },
                    error: function (oError) {
                        if (oError.statusCode === "404" || oError.statusCode === 404) {
                            oParams.s_no = 1;
                            oParams.IsActiveEntity = true;

                            let sNewKeys = `s_no=${oParams.s_no},` +
                                `reqid='${oParams.reqid}',` +
                                `asnum='${oParams.asnum || ""}',` +
                                `IsActiveEntity=${oParams.IsActiveEntity}`;

                            let newUrl = uri.replace(match[1], sNewKeys);
                            window.location.replace(newUrl);
                        }
                    }
                });
            }
        },

    }
});
