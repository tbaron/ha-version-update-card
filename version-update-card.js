const FIELDS = {
    title_update_available: {
        default: "Update Available",
        label: "Title when update is available",
        selector: { text: {} },
    },
    title_up_to_date: {
        default: "Up to date",
        label: "Title when up to date",
        selector: { text: {} },
    },
    entity_update_available: {
        default: "binary_sensor.home_assistant_website_update_available",
        label: "Update availability sensor",
        selector: { entity: { domain: "binary_sensor" } },
    },
    entity_version_installed: {
        default: "sensor.current_version",
        label: "Installed version sensor",
        selector: { entity: {} },
    },
    entity_version_latest: {
        default: "sensor.home_assistant_website",
        label: "Latest version sensor",
        selector: { entity: {} },
    },
    attribute_release_date: {
        default: "release_date",
        label: "Release date attribute",
        selector: { attribute: {} },
        context: { filter_entity: "entity_version_latest" },
    },
    attribute_release_title: {
        default: "release_title",
        label: "Release title attribute",
        selector: { attribute: {} },
        context: { filter_entity: "entity_version_latest" },
    },
    attribute_release_description: {
        default: "release_description",
        label: "Release description attribute",
        selector: { attribute: {} },
        context: { filter_entity: "entity_version_latest" },
    },
    attribute_release_notes_url: {
        default: "release_notes",
        label: "Release notes URL attribute",
        selector: { attribute: {} },
        context: { filter_entity: "entity_version_latest" },
    },
};

const DEFAULTS = Object.fromEntries(
    Object.entries(FIELDS).map(([name, { default: value }]) => [name, value])
);

const CARD_HTML = `
  <style>
    .content {
      padding: 0 16px 16px;
    }

    .versions {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      text-align: center;
    }

    .version {
      font-size: var(--ha-font-size-xl);
    }

    .version-current,
    small,
    .release-description {
      color: var(--secondary-text-color);
    }

    .date {
      text-decoration: underline dotted;
      text-decoration-color: color-mix(in srgb, currentColor 50%, transparent);
      text-underline-offset: 2px;
    }

    .release-info {
      margin-top: 16px;
    }

    h2 {
      font-size: var(--ha-font-size-l);
      font-weight: normal;
    }

    .is-latest {
      .versions {
        grid-template-columns: 1fr;
      }

      .version-current,
      .arrow,
      .release-info {
        display: none;
      }
    }
  </style>

  <ha-card>
    <div class="content">
      <div class="versions">
        <div class="version version-current"></div>
        <ha-icon class="arrow" icon="mdi:arrow-right"></ha-icon>

        <div>
          <b class="version version-latest"></b>
          <div>
            <small>
              <ha-relative-time class="date"></ha-relative-time>
            </small>
          </div>
        </div>
      </div>

      <div class="release-info">
        <h2>
          <a class="release-title" target="_blank" rel="noreferrer"></a>
        </h2>
        <div class="release-description"></div>
      </div>
    </div>
  </ha-card>
`;


class VersionUpdateCard extends HTMLElement {
    static getConfigForm() {
        return {
            schema: Object.entries(FIELDS).map(
                ([name, { label, ...values }]) => ({ name, ...values })
            ),
            computeLabel: ({ name }) => FIELDS[name]?.label,
        };
    }

    static getStubConfig() {
        return { ...DEFAULTS };
    }

    constructor() {
        super();

        this.attachShadow({ mode: "open" });
        this.shadowRoot.innerHTML = CARD_HTML;
        this.card = this.$("ha-card");
    }

    $(selector) {
        return this.shadowRoot.querySelector(selector);
    }

    setConfig(config) {
        this.config = { ...DEFAULTS, ...config };
    }

    set hass(hass) {
        const versionInstalled =
            hass.states[this.config.entity_version_installed];
        const versionLatest =
            hass.states[this.config.entity_version_latest];
        const updateAvailable =
            hass.states[this.config.entity_update_available];

        if (!versionInstalled || !versionLatest) return;

        const isUpToDate = updateAvailable?.state === "off";
        const attributes = versionLatest.attributes;
        const date = attributes[this.config.attribute_release_date];

        this.card.classList.toggle("is-latest", isUpToDate);
        this.card.header = isUpToDate
            ? this.config.title_up_to_date
            : this.config.title_update_available;

        this.$(".version-current").textContent = versionInstalled.state;
        this.$(".version-latest").textContent =
            isUpToDate ? versionInstalled.state : versionLatest.state;

        const relativeTime = this.$(".date");
        relativeTime.hass = hass;
        relativeTime.datetime = date;
        relativeTime.title = new Date(date).toLocaleString();

        if (isUpToDate) return;

        const releaseTitle =
            attributes[this.config.attribute_release_title];
        const releaseDescription =
            attributes[this.config.attribute_release_description];
        const releaseNotesUrl =
            attributes[this.config.attribute_release_notes_url];

        const release = this.$(".release-info");
        const link = this.$(".release-title");

        release.hidden = !releaseTitle && !releaseDescription;
        link.textContent = releaseTitle || "";
        this.$(".release-description").textContent =
            releaseDescription || "";

        if (releaseNotesUrl) {
            link.href = releaseNotesUrl;
        } else {
            link.removeAttribute("href");
        }
    }
}


customElements.define("version-update-card", VersionUpdateCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "version-update-card",
    name: "Version Update Card",
    description: "Notifies you of available Home Assistant updates with version and release information.",
    documentationURL: "https://github.com/tbaron/ha-version-update-card",
    preview: true,
});
