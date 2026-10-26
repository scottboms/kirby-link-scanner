window.panel.plugin(`scottboms/link-scanner`,{icons:{scanner:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.67127 4.25705L13.4142 12L12 13.4142L8.55382 9.96803C8.20193 10.5635 8 11.2582 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.87494 14.3429 8.13693 12.2503 8.00771L10.4459 6.20323C10.9416 6.07067 11.4625 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 10.7042 6.41079 9.50428 7.10925 8.52347L5.68014 7.09436C4.62708 8.44904 4 10.1513 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C10.8915 4 9.83557 4.22547 8.8757 4.63306L7.37443 3.13179C8.75768 2.40883 10.3311 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 8.87842 3.43029 6.09091 5.67127 4.25705Z"></path></svg>`},components:{"k-broken-links-view":{props:{initialLatest:{type:Object,default:()=>({hasScanned:!1,scannedAt:null,totalBrokenLinks:0,totalCheckedLinks:0,results:[]})},initialCurrent:{type:Object,default:()=>({id:null,isRunning:!1,isComplete:!1,cancelRequested:!1,startedAt:null,finishedAt:null,stoppedAt:null,workerStartedAt:null,processedPages:0,totalPages:0,currentPageTitle:null,lastError:null,updatedAt:null})},startUrl:{type:String,required:!0},stopUrl:{type:String,required:!0},completeUrl:{type:String,required:!0},statusUrl:{type:String,required:!0}},data(){return{isBusy:!1,latest:this.normalizeLatest(this.initialLatest),current:this.normalizeCurrent(this.initialCurrent),pollTimer:null,hasShownError:!1,completingKeys:[]}},computed:{isRunning(){return this.current.isRunning===!0},isStopping(){return this.current.isRunning===!0&&this.current.cancelRequested===!0},runButtonIcon(){return this.isRunning===!0?`loader`:`search`},runButtonText(){return this.isRunning===!0?`Scanning…`:`Start Scan`},columns(){return{url:{label:`Broken Link`,type:`url`},page:{label:`Page Title`},edit:{label:` `,type:`url`,width:`5rem`}}},rows(){return this.latest.results.map(e=>({id:this.resultKey(e),result:e,url:{href:e.url,text:e.url},page:e.pageTitle,edit:{href:this.absolutePanelUrl(e.panelUrl),text:`Edit`},options:this.rowOptions(e)}))},progressText(){return this.current.totalPages<1?`Preparing scan…`:this.isStopping===!0?`Stopping after ${this.current.processedPages} of ${this.current.totalPages} pages`:`${this.current.processedPages} of ${this.current.totalPages} pages scanned`},progressPercent(){return this.current.totalPages<1?0:Math.max(0,Math.min(100,Math.round(this.current.processedPages/this.current.totalPages*100)))},progressFillStyle(){return{position:`absolute`,inset:`0 auto 0 0`,width:`${this.progressPercent}%`,background:`repeating-linear-gradient(45deg, #b1d864, #b1d864 10px, #719726 10px, #719726 20px)`,transition:`width 240ms ease`}}},created(){this.current.isRunning===!0&&this.beginPolling()},beforeUnmount(){this.stopPolling()},methods:{resultKey(e){return[e?.url??``,e?.pageTitle??``,e?.panelUrl??``,e?.reason??``].join(`|`)},isCompleting(e){return this.completingKeys.includes(this.resultKey(e))},rowOptions(e){return[{icon:this.isCompleting(e)?`loader`:`check`,text:this.isCompleting(e)?`Completing…`:`Complete`,click:`complete`,disabled:this.isCompleting(e)}]},absolutePanelUrl(e){if(typeof e!=`string`||e.length===0)return``;let t=/^https?:\/\//i.test(e)?new URL(e):new URL(e,window.location.origin),n=t.pathname.indexOf(`/pages/`);if(n!==-1){let e=t.pathname.slice(0,n+7),r=t.pathname.slice(n+7);r.includes(`/`)&&r.includes(`+`)===!1&&(t.pathname=e+r.replaceAll(`/`,`+`))}return t.toString()},normalizeLatest(e){return{hasScanned:!!e?.hasScanned,scannedAt:typeof e?.scannedAt==`string`&&e.scannedAt.length>0?e.scannedAt:null,totalBrokenLinks:Number(e?.totalBrokenLinks||0),totalCheckedLinks:Number(e?.totalCheckedLinks||0),results:Array.isArray(e?.results)?e.results:[]}},normalizeCurrent(e){return{id:typeof e?.id==`string`?e.id:null,isRunning:!!e?.isRunning,isComplete:!!e?.isComplete,cancelRequested:!!e?.cancelRequested,startedAt:typeof e?.startedAt==`string`&&e.startedAt.length>0?e.startedAt:null,finishedAt:typeof e?.finishedAt==`string`&&e.finishedAt.length>0?e.finishedAt:null,stoppedAt:typeof e?.stoppedAt==`string`&&e.stoppedAt.length>0?e.stoppedAt:null,workerStartedAt:typeof e?.workerStartedAt==`string`&&e.workerStartedAt.length>0?e.workerStartedAt:null,processedPages:Number(e?.processedPages||0),totalPages:Number(e?.totalPages||0),currentPageTitle:typeof e?.currentPageTitle==`string`&&e.currentPageTitle.length>0?e.currentPageTitle:null,lastError:typeof e?.lastError==`string`&&e.lastError.length>0?e.lastError:null,updatedAt:typeof e?.updatedAt==`string`&&e.updatedAt.length>0?e.updatedAt:null}},formatDate(e,t={}){if(typeof e!=`string`||e.length===0)return``;let n=new Date(e);return Number.isNaN(n.getTime())?e:new Intl.DateTimeFormat(void 0,t).format(n)},formatSummaryDate(e){return this.formatDate(e,{month:`2-digit`,day:`2-digit`,year:`numeric`})},formatStatusDate(e){return this.formatDate(e,{hour:`numeric`,minute:`2-digit`,second:`2-digit`})},formatSummaryTime(e){return this.formatDate(e,{hour:`numeric`,minute:`2-digit`})},formatStoppedDate(e){return this.formatDate(e,{dateStyle:`medium`,timeStyle:`short`})},async requestJson(e,t=`GET`,n=null){let r=t===`GET`?await this.$panel.get(e):await this.$panel.post(e,n??{});if(r?.status===`error`)throw Error(r?.message||`The link scan failed.`);return r??{}},applyPayload(e){this.current=this.normalizeCurrent(e?.current),this.latest=this.normalizeLatest(e?.latest)},beginPolling(){this.stopPolling(),this.pollTimer=window.setInterval(()=>{this.refreshStatus(!1)},5e3)},stopPolling(){this.pollTimer&&=(window.clearInterval(this.pollTimer),null)},showError(e){this.$panel.notification.error(e)},maybeShowWorkerError(){this.current.lastError&&this.hasShownError===!1&&(this.hasShownError=!0,this.showError(this.current.lastError))},async startScan(){this.isBusy=!0,this.hasShownError=!1;try{let e=await this.requestJson(this.startUrl,`POST`);this.applyPayload(e),this.current.isRunning===!0&&this.beginPolling()}catch(e){this.showError(e?.message||`Could not start the scan.`)}finally{this.isBusy=!1}},async stopScan(){this.isBusy=!0;try{let e=await this.requestJson(this.stopUrl,`POST`);this.applyPayload(e),this.current.isRunning===!0?this.beginPolling():this.stopPolling()}catch(e){this.showError(e?.message||`Could not stop the scan.`)}finally{this.isBusy=!1}},async completeResult(e){let t=this.resultKey(e);if(this.completingKeys.includes(t)!==!0){this.completingKeys=[...this.completingKeys,t];try{let t=await this.requestJson(this.completeUrl,`POST`,{url:e.url,pageTitle:e.pageTitle,panelUrl:e.panelUrl,reason:e.reason});this.applyPayload(t)}catch(e){this.showError(e?.message||`Could not mark the row as complete.`)}finally{this.completingKeys=this.completingKeys.filter(e=>e!==t)}}},async onTableOption(e,t){e===`complete`&&t?.result&&await this.completeResult(t.result)},async refreshStatus(e=!0){e===!0&&(this.isBusy=!0);try{let e=await this.requestJson(this.statusUrl,`GET`);this.applyPayload(e),this.current.isRunning===!0?this.beginPolling():this.stopPolling(),this.maybeShowWorkerError()}catch(t){this.stopPolling(),e===!0&&this.showError(t?.message||`Could not refresh scan status.`)}finally{e===!0&&(this.isBusy=!1)}}},template:`
			<k-panel-inside>
				<div class="k-broken-links-view">
					<k-header class="k-site-view-header">
						Link Scanner
						<template #buttons>
							<k-button-group>
								<k-button
									:disabled="isBusy || isRunning"
									:icon="runButtonIcon"
									:text="runButtonText"
									size="sm"
									theme="green"
									variant="filled"
									@click="startScan"
								/>
								<k-button
									v-if="current.isRunning === true"
									:disabled="isBusy || isStopping"
									:icon="isStopping ? 'loader' : 'cancel'"
									:text="isStopping ? 'Stopping…' : 'Stop Scan'"
									size="sm"
									theme="negative"
									variant="filled"
									@click="stopScan"
								/>
								<k-button
									:disabled="isBusy"
									icon="refresh"
									text="Refresh"
									size="sm"
									theme="passive"
									variant="filled"
									@click="refreshStatus(true)"
								/>
							</k-button-group>
						</template>
					</k-header>

					<k-box v-if="current.lastError" theme="negative" style="margin-bottom: var(--spacing-4);">
						{{ current.lastError }}
					</k-box>

					<k-box v-if="current.stoppedAt" theme="passive" icon="info" style="margin-bottom: var(--spacing-4);">
						Scan stopped at {{ formatStoppedDate(current.stoppedAt) }}.
					</k-box>

					<k-box v-if="latest.hasScanned === false && isRunning === false" icon="search" theme="info" style="margin-bottom: var(--spacing-4);">
						No results yet. Start or restart a scan to check for broken links.
					</k-box>

					<k-box v-if="current.isComplete === true && rows.length === 0" icon="check" theme="positive" style="margin-bottom: var(--spacing-4);">
						No broken links were found.
					</k-box>

					<div v-if="latest.hasScanned === true && isRunning === false" data-variant="columns" class="k-grid" style="margin-bottom: var(--spacing-4)">
						<div class="k-column" style="--width: 1/1">
							<dl data-size="huge" class="k-stats">
								<div data-theme="info" class="k-stat">
									<dt class="k-stat-label">Unique Links</dt>
									<dd class="k-stat-value">{{ latest.totalCheckedLinks }}</dd>
									<dd class="k-stat-info">Scan Results</dd>
								</div>

								<div data-theme="info" class="k-stat">
									<dt class="k-stat-label">Broken Links</dt>
									<dd class="k-stat-value">{{ latest.totalBrokenLinks }}</dd>
									<dd class="k-stat-info">404/500 Responses</dd>
								</div>

								<div v-if="latest.scannedAt" data-theme="info" class="k-stat">
									<dt class="k-stat-label">at {{ formatSummaryTime(latest.scannedAt) }}</dt>
									<dd class="k-stat-info">Last Scan</dd>
									<dd class="k-stat-value">{{ formatSummaryDate(latest.scannedAt) }}</dd>
								</div>
							</dl>
						</div>
					</div>

					<k-box v-if="isRunning" class="k-progress-info" theme="white" style="margin-bottom: var(--spacing-4)">
						<k-box icon="clock" v-if="current.startedAt">Started at {{ formatStatusDate(current.startedAt) }}</k-box>
						<!--<k-box v-if="current.workerStartedAt">Worker {{ formatStatusDate(current.workerStartedAt) }}</k-box>-->
						<k-box icon="refresh" v-if="current.updatedAt">Last update: {{ formatStatusDate(current.updatedAt) }}</k-box>
						<k-box icon="url" v-if="current.currentPageTitle"><b>Page:</b> {{ current.currentPageTitle }}</k-box>
						<k-box icon="cancel" v-if="current.cancelRequested">Stop requested.</k-box>
					</k-box>

					<div v-if="isRunning" style="margin-top: var(--spacing-4);">
						<div class="k-progress-container">
							<div :style="progressFillStyle"></div>
							<div class="k-progress-bar">{{ progressText }}</div>
						</div>
					</div>

					<k-table
						v-else
						:columns="columns"
						:rows="rows"
						empty="No broken links found."
						@option="onTableOption"
					/>
				</div>
			</k-panel-inside>`}}});
