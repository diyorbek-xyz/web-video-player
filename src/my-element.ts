import { LitElement, html, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { FullscreenExitIcon, FullscreenIcon, MutedIcon, PauseIcon, PlayIcon, SettingIcon, VolumeIcon } from './icons';
import timeslider from './time-slider.css?inline';
import videoplayer from './video-player.css?inline';

const TAG_NAME = 'video-player';
function formatTime(time: number) {
	return Math.floor(time / 60) + ':' + ('0' + Math.floor(time % 60)).slice(-2);
}
function clamp(value: number, min: number, max: number) {
	return Math.max(Math.min(Number(value.toFixed(2)), max), min);
}

@customElement('time-slider')
class TimeSlider extends LitElement {
	static styles = unsafeCSS(timeslider);

	seek!: (time: number) => void;

	@query('#track') trackEl!: HTMLDivElement;
	@query('#timeslider') timesliderEl!: HTMLDivElement;
	@query('#preview') previewEl!: HTMLDivElement;
	@property({ type: Number }) time!: number;
	@property({ type: Number }) duration!: number;

	@property({ type: Number }) private position = clamp((100 * this.time) / this.duration, 0, this.duration);
	@property({ type: Boolean }) private hovering = false;
	@property({ type: Number }) private hover_position = 0;

	@property({ type: Boolean }) private timesetting = false;
	@property({ type: Number }) private preview_position = 0;
	@property({ type: Number }) private preview_time = 0;
	@property({ type: String }) private preview_image = '/poster.png';

	protected updated(_changedProperties: PropertyValues): void {
		this.position = clamp((this.time * 100) / this.duration, 0, 100);
	}
	render() {
		return html`
			<div id="timeslider" @touchend=${this.exit} @touchstart=${this.move} @touchcancel=${this.exit} @touchmove=${this.move} @click=${this.move} @mousemove=${this.move} @mouseup=${this.exit} @mouseleave=${this.exit} @mouseout=${this.exit}>
				<div id="track" class="track ${this.hovering ? 'hovering' : ''}">
					<div class="range">
						<div class="fill" style="width:${this.position}%"></div>
						<div class="hover" style="width:${this.hover_position}%"></div>
						<div class="buffer"></div>
					</div>
					<div class="thumb" style="left:${this.position}%"></div>
				</div>
				<div id="preview" class="preview ${this.hovering ? 'active' : ''}" style="left:${this.preview_position}px">
					<img width="200" src=${this.preview_image} />
					<h3 class="time">${formatTime(this.preview_time)}</h3>
				</div>
			</div>
			<img class="big_image ${this.timesetting ? 'active' : ''}" src="/poster.png" />
		`;
	}

	timeset(clientX: number) {
		const rect = this.trackEl.getBoundingClientRect();
		const timeAtCursor = ((clientX - rect.left) / rect.width) * this.duration;
		this.seek(clamp(timeAtCursor, 0, this.duration));
	}
	previewing(clientX: number) {
		const rect = this.trackEl.getBoundingClientRect();
		const timeAtCursor = ((clientX - rect.left) / rect.width) * this.duration;
		this.hover_position = clamp((timeAtCursor * 100) / this.duration, 0, 100);
		const previewRect = this.previewEl.getBoundingClientRect();
		this.preview_time = clamp(timeAtCursor, 0, this.duration);
		this.preview_position = clamp(clientX - previewRect.width / 2, 10, rect.width + rect.left - previewRect.width + 2 - 10);
	}
	exit() {
		console.log('Exit');
		this.timesetting = false;
		this.hovering = false;
	}
	move(e: MouseEvent | TouchEvent) {
		this.hovering = true;
		if (e instanceof MouseEvent) {
			this.previewing(e.clientX);
			if (e.buttons == 1) {
				this.timesetting = true;
				this.timeset(e.clientX);
			} else {
				this.timesetting = false;
			}
		} else if (e instanceof TouchEvent) {
			this.previewing(e.touches[0].clientX);
			this.timeset(e.touches[0].clientX);
		}
	}
}

@customElement(TAG_NAME)
export class VideoPlayer extends LitElement {
	static styles = unsafeCSS(videoplayer);

	@query('#video') private videoEl!: HTMLVideoElement;
	@query('#player_container') private playerEl!: HTMLDivElement;
	@query('#timeslider_element') private timesliderEl!: TimeSlider;
	@property({ type: Boolean }) private _open = false;

	@property({ type: String }) src = '/berserk.mp4';
	@property({ type: Boolean }) paused = false;
	@property({ type: Boolean }) muted = false;
	@property({ type: Number }) volume = 0;
	@property({ type: Number }) time = 0;
	@property({ type: Number }) duration = 1;
	@property({ type: Boolean }) fullscreen = false;

	protected firstUpdated(_changedProperties: PropertyValues): void {
		this.volume = this.videoEl.volume;
		this.muted = this.videoEl.muted;
		this.paused = this.videoEl.paused;
		this.fullscreen = document.fullscreenElement == this.playerEl;
		this.videoEl.addEventListener('loadedmetadata', () => {
			this.duration = this.videoEl.duration;
			this.time = this.videoEl.currentTime;
		});
		this.videoEl.addEventListener('play', () => (this.paused = false));
		this.videoEl.addEventListener('pause', () => (this.paused = true));
		this.videoEl.addEventListener('timeupdate', () => (this.time = this.videoEl.currentTime));
	}
	protected updated(_changedProperties: PropertyValues): void {
		this.time = this.videoEl.currentTime;
		this.timesliderEl.time = this.time;
	}

	render() {
		return html`
			<div id="player_container" class="${this.fullscreen ? 'fullscreen' : ''}">
				<div id="video_element"><video id="video" src=${this.src}></video></div>
				<div id="root">
					<div id="infos_root"></div>
					<div id="overlays_root">
						<div id="overlays"></div>
						<div id="resolution_menu" class="${this._open ? 'open' : ''}">
							<h3 class="title">Quality</h3>
							<div class="item">1080p</div>
							<div class="item">720p</div>
							<div class="item">480p</div>
							<div class="item">360p</div>
							<div class="item">144p</div>
							<div class="item">Auto</div>
						</div>
					</div>
					<div id="timeslider_root">
						<time-slider id="timeslider_element" time=${this.time} .seek=${this.seek} duration=${this.duration}></time-slider>
					</div>
					<div id="controls">
						<div>
							<div class="button" @click=${this.togglePlay}>${this.paused ? PlayIcon : PauseIcon}</div>
							<div class="button" @click=${this.toggleMuted}>${this.muted ? MutedIcon : VolumeIcon}</div>
							<input @change=${this.changeVolume} type="range" max="1" min="0" step="0.1" .value=${String(this.volume)} />
							<div class="button time_display">${formatTime(this.time)} / ${formatTime(this.duration)}</div>
						</div>
						<div>
							<div class="button" @click=${this._toggleOpen} data-open=${this._open}>${SettingIcon}</div>
							<div class="button" @click=${this.toggleFullscreen}>${this.fullscreen ? FullscreenExitIcon : FullscreenIcon}</div>
						</div>
					</div>
				</div>
			</div>
		`;
	}

	_toggleOpen() {
		this._open = !this._open;
	}
	seek = (time: number) => {
		this.videoEl.currentTime = time;
		this.time = this.videoEl.currentTime;
	};
	toggleFullscreen() {
		if (!document.fullscreenElement) {
			this.playerEl.requestFullscreen().then(() => (this.fullscreen = true));
		} else {
			document.exitFullscreen().then(() => (this.fullscreen = false));
		}
	}
	changeVolume(event: Event) {
		this.videoEl.volume = Number((event.target as HTMLInputElement).value);
		this.volume = this.videoEl.volume;
		this.videoEl.muted = this.volume == 0;
		this.muted = this.volume == 0;
	}
	togglePlay() {
		if (this.videoEl.paused) {
			this.videoEl.play();
			this.paused = false;
		} else {
			this.videoEl.pause();
			this.paused = true;
		}
	}
	toggleMuted() {
		this.videoEl.muted = !this.videoEl.muted;
		this.muted = this.videoEl.muted;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		[TAG_NAME]: VideoPlayer;
		'time-slider': TimeSlider;
	}
}
