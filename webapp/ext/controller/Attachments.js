sap.ui.define(["sap/m/MessageBox"], function (MessageBox) {
    "use strict";

    return {  
        onBeforeUploadStarts: function (oEvent) {
            let oUploadSet = this.getView().byId("idUploadSet");
            let sTokenForUpload = this.getOwnerComponent().getModel("CV_ATTACHMENT_SRV").getSecurityToken()

            let oUploadItem = oEvent.getParameter('item')
            let sFileName = oUploadItem.getProperty("fileName");
            let sReqid = this.getView().getBindingContext().getProperty('reqid')

            //HEADER PARAMETERS
            oUploadSet.addHeaderField(new sap.ui.core.Item({
                key: "X-CSRF-Token",
                text: sTokenForUpload
            }))

            oUploadSet.addHeaderField(new sap.ui.core.Item({
                key: "objectkey",
                text: btoa(`${sReqid}`)
            }))
            oUploadSet.addHeaderField(new sap.ui.core.Item({
                key: "objecttype",
                text: "BUS1006"
            }))
            oUploadSet.addHeaderField(new sap.ui.core.Item({
                key: "slug",
                text: btoa(sFileName)
            }))
        },
        onUploadCompleted: function (oEvent) {
            //Remove added headers
            let oUploadSet = this.getView().byId("idUploadSet");
            oUploadSet.removeAllHeaderFields();
            let oResponse = oEvent.getParameters("response");
            if (oResponse.status === 201) {
                this._getattachment()
                sap.m.MessageToast.show("File uploaded successfully")
            } else {
                MessageBox.error(
                    `
                SOMETHING WENT WRONG \n
                Status:${oResponse.status} \n
                Response:${oResponse.responseRaw}`
                )
            }
        },
        onDeleteAttachment: function (oEvent) {
            oEvent.preventDefault();
            let oSelectedItemData = oEvent.getParameter('item').getBindingContext('attachmentDetail').getObject()
            let oModel = this.getOwnerComponent().getModel("CV_ATTACHMENT_SRV");
            let sPath = oSelectedItemData.__metadata.uri.split('/CV_ATTACHMENT_SRV')[1];
            let sReqid = this.getView().getBindingContext().getProperty('reqid')

            MessageBox.confirm("Are you sure you want to delete this file?", {
                title: "Confirm Deletion",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.YES) {
                        oModel.remove(sPath, {
                            headers: {
                                "objectkey": btoa(sReqid),
                                "objecttype": "BUS1006"
                            },
                            success: function () {
                                this._getattachment();
                                sap.m.MessageToast.show("File deleted successfully");
                            }.bind(this),
                            error: function (oErr) {
                                let sErrMsg = JSON.parse(oErr.responseText).error.message.value;
                                sap.m.MessageBox.error(sErrMsg);
                            }
                        });
                    }
                }.bind(this)
            });
        },

    };
});