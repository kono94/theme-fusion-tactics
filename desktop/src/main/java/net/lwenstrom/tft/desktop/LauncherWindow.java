package net.lwenstrom.tft.desktop;

import java.awt.BorderLayout;
import java.awt.Desktop;
import java.awt.FlowLayout;
import java.awt.Taskbar;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.io.IOException;
import java.net.URI;
import java.util.concurrent.atomic.AtomicReference;
import javax.imageio.ImageIO;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import javax.swing.border.EmptyBorder;

final class LauncherWindow {
    private final JFrame frame = new JFrame("Theme Fusion Tactics");
    private final JLabel status = new JLabel("Starting TFT…");
    private final JButton openGame = new JButton("Open Game");

    LauncherWindow(AppPaths paths, Preferences preferences, Runnable open, Runnable quit) {
        applyIcon();
        var content = new JPanel(new BorderLayout(12, 18));
        content.setBorder(new EmptyBorder(20, 20, 20, 20));
        content.add(status, BorderLayout.NORTH);
        var controls = new JPanel(new FlowLayout(FlowLayout.LEFT));
        openGame.setEnabled(false);
        openGame.addActionListener(event -> open.run());
        controls.add(openGame);
        var configuration = new JButton("Open Configuration Folder");
        configuration.addActionListener(event -> {
            try {
                Desktop.getDesktop().open(paths.root().toFile());
            } catch (Exception exception) {
                message("Configuration folder: " + paths.root());
            }
        });
        controls.add(configuration);
        var quitButton = new JButton("Quit");
        quitButton.addActionListener(event -> quit.run());
        controls.add(quitButton);
        content.add(controls, BorderLayout.CENTER);
        var settings = new JPanel(new FlowLayout(FlowLayout.LEFT));
        var check = new JCheckBox("Check for updates", preferences.checkForUpdates());
        var automatic = new JCheckBox("Automatically update before playing", preferences.automaticUpdates());
        automatic.setEnabled(check.isSelected());
        var save = (Runnable) () -> {
            automatic.setEnabled(check.isSelected());
            try {
                JsonFiles.write(paths.preferences(), new Preferences(check.isSelected(), automatic.isSelected()));
            } catch (Exception exception) {
                message("Could not save update preferences: " + exception.getMessage());
            }
        };
        check.addActionListener(event -> save.run());
        automatic.addActionListener(event -> save.run());
        settings.add(check);
        settings.add(automatic);
        content.add(settings, BorderLayout.SOUTH);
        frame.setContentPane(content);
        frame.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.APP_QUIT_HANDLER)) {
            Desktop.getDesktop().setQuitHandler((event, response) -> {
                response.cancelQuit();
                quit.run();
            });
        }
        frame.addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent event) {
                quit.run();
            }
        });
        frame.pack();
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }

    private void applyIcon() {
        try (var input = LauncherWindow.class.getResourceAsStream("/icons/app-icon.png")) {
            if (input == null) throw new IllegalStateException("Missing application icon");
            var icon = ImageIO.read(input);
            if (icon == null) throw new IllegalStateException("Invalid application icon");
            frame.setIconImage(icon);
            if (Taskbar.isTaskbarSupported()) {
                var taskbar = Taskbar.getTaskbar();
                if (taskbar.isSupported(Taskbar.Feature.ICON_IMAGE)) taskbar.setIconImage(icon);
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load application icon", exception);
        }
    }

    void status(String text) {
        SwingUtilities.invokeLater(() -> status.setText(text));
    }

    void ready(String version) {
        SwingUtilities.invokeLater(() -> {
            status.setText("Playing " + version + " — close this launcher to quit the game");
            openGame.setEnabled(true);
        });
    }

    void focus() {
        SwingUtilities.invokeLater(() -> {
            frame.setVisible(true);
            frame.setState(JFrame.NORMAL);
            frame.toFront();
        });
    }

    void dispose() {
        SwingUtilities.invokeLater(frame::dispose);
    }

    boolean update(String version) {
        return question("TFT " + version + " is available.", new String[] {"Update and Play", "Play Current Version"});
    }

    boolean confirmQuit() {
        return question(
                "Quitting stops the current match. Your local match history will be kept.",
                new String[] {"Quit Game", "Keep Playing"});
    }

    boolean installer(String version) {
        return question(
                "TFT " + version + " needs a newer launcher or Java runtime. Download the new installer?",
                new String[] {"Open Download", "Play Current Version"});
    }

    private boolean question(String text, String[] choices) {
        var answer = new AtomicReference<>(false);
        onUi(() -> answer.set(JOptionPane.showOptionDialog(
                        frame,
                        text,
                        "Theme Fusion Tactics",
                        JOptionPane.DEFAULT_OPTION,
                        JOptionPane.INFORMATION_MESSAGE,
                        null,
                        choices,
                        choices[1])
                == 0));
        return answer.get();
    }

    void message(String text) {
        onUi(() -> JOptionPane.showMessageDialog(frame, text, "Theme Fusion Tactics", JOptionPane.INFORMATION_MESSAGE));
    }

    static void browse(URI uri) throws Exception {
        if (!Desktop.isDesktopSupported() || !Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
            throw new IllegalStateException("Open this address in your browser: " + uri);
        }
        Desktop.getDesktop().browse(uri);
    }

    private static void onUi(Runnable action) {
        try {
            if (SwingUtilities.isEventDispatchThread()) action.run();
            else SwingUtilities.invokeAndWait(action);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not display launcher dialog", exception);
        }
    }
}
