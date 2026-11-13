import Foundation
import Speech
import AVFoundation

@MainActor
public final class VoiceSpeechManager: ObservableObject {
    public static let shared = VoiceSpeechManager()

    @Published public var isListening: Bool = false
    @Published public var transcript: String = ""
    @Published public var statusMessage: String = "Tap to speak"
    @Published public var isAuthorized: Bool = false

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private var silenceTimer: Task<Void, Never>?

    public init() {
        requestAuthorization()
    }

    public func requestAuthorization() {
        SFSpeechRecognizer.requestAuthorization { authStatus in
            Task { @MainActor in
                switch authStatus {
                case .authorized:
                    self.isAuthorized = true
                case .denied, .restricted, .notDetermined:
                    self.isAuthorized = false
                @unknown default:
                    self.isAuthorized = false
                }
            }
        }
    }

    public func startListening(onCommand: @escaping (String) -> Void) {
        guard !audioEngine.isRunning else {
            stopListening()
            return
        }

        recognitionTask?.cancel()
        recognitionTask = nil

        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            statusMessage = "Audio session error: \(error.localizedDescription)"
            return
        }

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else {
            statusMessage = "Unable to create request"
            return
        }
        recognitionRequest.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
            isListening = true
            transcript = ""
            statusMessage = "Listening... Speak naturally"
        } catch {
            statusMessage = "Audio engine start failed"
            return
        }

        recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                let heard = result.bestTranscription.formattedString
                Task { @MainActor in
                    self.transcript = heard
                    self.statusMessage = "Hearing: \"\(heard)\""

                    // Reset silence timer: when user pauses for 900ms, auto-stop and execute!
                    self.silenceTimer?.cancel()
                    self.silenceTimer = Task {
                        try? await Task.sleep(nanoseconds: 900_000_000)
                        if self.isListening && !heard.trimmingCharacters(in: .whitespaces).isEmpty {
                            self.stopListening()
                            onCommand(heard)
                        }
                    }
                }
            }

            if error != nil || result?.isFinal == true {
                Task { @MainActor in
                    if self.isListening {
                        self.stopListening()
                        let cmd = self.transcript.trimmingCharacters(in: .whitespaces)
                        if !cmd.isEmpty {
                            onCommand(cmd)
                        }
                    }
                }
            }
        }
    }

    public func stopListening() {
        silenceTimer?.cancel()
        silenceTimer = nil

        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil

        isListening = false
        statusMessage = "Tap to speak"

        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
